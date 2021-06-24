import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationEvents } from './events/organization.events';
import { IUser, IUserToken } from 'src/user/interfaces/user.interface';
import { Errors } from 'src/config/errors';
import { OrganizationPermissions } from './permissions/organization.permissions';
import { Action } from 'src/casl/actions';
import { IOrganization, IOrganizationEvent, IOrganizationUserDeletedEvent, IOrganizationAdminDeletedEvent } from './interfaces/organization.interface';
import { InjectedConstants } from 'src/config/constants.config';
import { UpdateOrganizationUsersDto } from './dto/update-organization-users.dto';
import { UpdateOrganizationAdminsDto } from './dto/update-organization-admins.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(InjectedConstants.organization_model) private organizationModel: Model<IOrganization>,
    @Inject(InjectedConstants.user_model) private userModel: Model<IUser>,
    private eventEmitter: EventEmitter2,
    private organizationPermissions: OrganizationPermissions,
    private readonly logger: Logger,
  ) {}

  /**
   * 
   * @param createOrganizationDto 
   * @param user 
   * @Event organizationCreatedEvent
   * @returns Returns a created organization based on input.  Will create the organization in addition to updating the user model to contain the org.  Releases the organization created event
   */
  async create(createOrganizationDto: CreateOrganizationDto, user: IUserToken) {

    //first, let's create our access object to mimic the prepared object for Mongo
    const createOrganizationDao = {
      ...createOrganizationDto,
      users: [user._id], //just need to create the array of a single user upon initial creation.  WIll push more into it on update,
      admins: [user._id], //User who created the org is by default an admin
      updatedBy: user._id,
      createdBy: user._id
    }

    //create the new object
    const organization = await this.organizationModel.create(createOrganizationDao);

    if (!organization) {
      let err = new Error('Unable to create the new organization')
      err['code'] = Errors.UnableToCreate
      throw err;
    }


    //let's add the organization to the user who created it
    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: user._id },
      {
        $addToSet: {
          organizations: Types.ObjectId(organization._id)
        }
      }
    ).orFail()

    //let's send out our event for any listeners to catch
    const orgCreatedEvt: IOrganizationEvent = {
      organization: organization,
      user: user
    }

    //log our created org
    this.logger.log(`User ${user._id} created organization ${organization._id}`);

    this.eventEmitter.emit(
      OrganizationEvents.created,
      orgCreatedEvt
    )

    const { _id, name, description, admins, users, projects, user_groups, createdBy, updatedBy  } = organization;
    
    return { _id, name, description, admins, users, projects, user_groups, createdBy, updatedBy  };
  }

  /**
   * 
   * @param user 
   * @returns finds all organizations that a given user belongs to.  Will query the organization Model and use the supplied user token to list all
   */
  async findAll(user: IUserToken) {
    const userDocument = await this.userModel.findById(user._id).populate('organizations').orFail();

    return userDocument.organizations;
  }

  /**
   * 
   * @param organizationId 
   * @param user 
   * @Permission - requires user to be listed as either an admin or a user of the organization
   * @returns an organization document for the specific organization passed into the params
   */
  async findOne(organizationId: string, user: IUserToken) {

    //throw document not found error first if no doc
    const organization = await this.organizationModel.findById(organizationId).orFail();


    if (this.organizationPermissions.checkPermission(Action.Read, organization, user)) {
      return organization;
    }

    let err = new Error('Insufficient permissions to read this organization. You must be a user of the organization.')
    err['code'] = Errors.Forbidden;
    throw err;
  }

  /**
   * 
   * @param organizationId 
   * @param updateOrganizationDto 
   * @param user 
   * @event organization updated event
   * @permission Requires admin permission; being listed as an admin of the org
   * @returns returns the updated organization object
   */
  async update(organizationId: string, updateOrganizationDto: UpdateOrganizationDto, user: IUserToken) {

    //first let's lookup our org
    const organization = await this.organizationModel.findOne({ _id: organizationId }).orFail()

    //reject if not an admin for this org
    if (!this.organizationPermissions.checkPermission(Action.Update, organization, user)) {
      let err = new Error('You have insufficient permissions to update this organization.')
      err['code'] = Errors.Forbidden
      throw err;
    }

    //since we have access, let's setup our DAO
    const updateOrganizationDao = {
      ...updateOrganizationDto,
      updatedBy: user._id
    }
    
    //run the query
    //returns the old item by default
    organization.set(updateOrganizationDao);

    await organization.save();

    //emit our updated Org event event
    const organizationUpdatedEvent: IOrganizationEvent = {
      organization: organization,
      user: user
    }

    this.eventEmitter.emit(
      OrganizationEvents.updated,
      organizationUpdatedEvent
    )

    //log the updated org/action
    this.logger.log(`Organization updated: user ${user._id} updated organization ${organization._id}`)

    return organization;
    
  }

  /**
   * 
   * @param organizationId 
   * @param user instance of UserToken
   * @event organizationDeletedEvent
   * @permission admin - requires being an admin of this organization
   * @returns organization - the organization which was deleted
   */
  async remove(organizationId: string, user: IUserToken) {

    //first let's retrieve the specific org
    const organization = await this.organizationModel.findById(organizationId).orFail();

    //let's check to make sure the user is an admin of the org first
    if (!this.organizationPermissions.checkPermission(Action.Delete, organization, user)) {
      let err = new Error('Error - Insufficient priveleges to modify/delete this organization.');
      err['code'] = Errors.Forbidden;
      throw err;
    }

    //now let's do business logic checking - we don't want to delete any orgs that still have projects associated with them
    if (organization.projects.length > 0) {
      let err = new Error('Error - Unable to delete an organization that still has active projects');
      err['code'] = Errors.ActionNotAllowed;
      throw err;
    }

    //let's emit our event to delete the org
    const organizationDeletedEvent: IOrganizationEvent = {
      organization: organization,
      user: user
    } 

    this.eventEmitter.emit(
      OrganizationEvents.deleted,
      organizationDeletedEvent
    )

    //log our deleted or
    this.logger.log(`Organization Deleted: user ${user._id} deleted organization ${organization._id}.`)

    //if all good, let's remove this org entirely
    return await organization.delete();
  }
}


/**
 * Service class for Organization User management
 * 
 */

@Injectable()
export class OrganizationUserService {
  constructor(
    @Inject(InjectedConstants.organization_model) private organizationModel: Model<IOrganization>,
    @Inject(InjectedConstants.user_model) private userModel: Model<IUser>,
    private eventEmitter: EventEmitter2,
    private organizationPermissions: OrganizationPermissions,
    private readonly logger: Logger,
  ) {}

  /**
   * 
   * @param organizationId - Org Id passed to path
   * @param user - IUserToken
   * @permission - requires that the user supplied by the token be either an admin or a user of the organization
   * @returns Finds all users that belong to an organization and returns them.  Will return an object containing the admins array and the users array
   */
  async findAll(organizationId: string, user: IUserToken) {

    //first let's grab our doc
    const organization = await this.organizationModel.findById(organizationId).orFail();

    //now, let's verify if the user has permission to view.  Either an admin or user of the org needs READ
    if (!this.organizationPermissions.checkPermission(Action.Read, organization, user)) {
      console.log(user)
      let err = new Error('Error - you have insufficient privileges to view this organization');
      err['code'] = Errors.Forbidden
      throw err;
    }

    //let's populate our users to grab the emails/any other info
    await organization.populate('users', '_id email').execPopulate();

    //let's return the users and admins of the org
    return {
      _id: organization._id,
      users: organization.users
    }
  }

  /**
   * Updates the user or admin list of an organization to ONLY ADD new users.  
   * 
   * @param organizationId 
   * @param UpdateOrganizationUsersDto 
   * @param user
   * @event releases org users updated event 
   * @permission requires admin access to the organization
   * @returns returns the updated users/admins list on the named org
   */
  async update(organizationId: string, updateOrganizationUsersDto: UpdateOrganizationUsersDto, user: IUserToken) {
    
    //let's retrieve our org and make sure it exists
    const organization = await this.organizationModel.findOne({ _id: organizationId }).orFail();

    //check permissions - you MUST be an admin to update these lists
    if (!this.organizationPermissions.checkPermission(Action.Update, organization, user)) {
      let err = new Error('Error - you have insufficient privileges to update this organization.');
      err['code'] = Errors.Forbidden;
      throw err;
    }

    //let's build our update DAO
    let updateOrgUsersDao = {
      $addToSet: {
        users: { $each: updateOrganizationUsersDto.users }
      },
      updatedBy: user._id
    }

    //let's use addToSet to push these new users or admins to our array
    await organization.updateOne(updateOrgUsersDao, { new: true })

    //now let's add the org to each of the user's accounts
    await Promise.all(updateOrganizationUsersDto.users.map((user) => {
      return this.userModel.findByIdAndUpdate(user, {
        $addToSet: { organizations: organization._id }
      })
    }))

    //emit our updated users list event
    updateOrganizationUsersDto.users.forEach((user) => {
      this.eventEmitter.emit(
        OrganizationEvents.updated,
        {
          organization: organization,
          user: user,
          updatedUser: user
        }
      )
    })

    


    return {
      _id: organization._id,
      users: organization.users,
    }
    
  }

  /**
   * deletes a singler user based on user and organization passed into the route param
   * 
   * @param organizationId 
   * @param userIdToDelete 
   * @param user 
   * @event emits the organizationUserDeleted event
   * @permission Requires that the user requesting the action be an admin for the organization
   * @returns Returns the updated list of users for an organization post-delete
   */
  async remove(organizationId: string, userIdToDelete: string, user: IUserToken) {

    //first, let's grab our organization
    const organization = await this.organizationModel.findById(organizationId).orFail();

    //let's see if we have permission to remove the users (aka is an admin)
    if (!this.organizationPermissions.checkPermission(Action.Delete, organization, user)) {
      let err = new Error('You have insufficient privileges to update/delete this organization.');
      err['code'] = Errors.Forbidden;
      throw err;
    }

    //check to see if the user is an admin - we don't want to be able to remove the user from 'users' if they are an 'admin'.  They must remove them as an admin first, then as a user
    if (organization.admins.includes(Types.ObjectId(userIdToDelete))) {
      let err = new Error('You cannot remove a user that is also an admin of an organization.  Please remove them as an admin first.');
      err['code'] = Errors.ActionNotAllowed;
      throw err;
    }

    //lets run update query to remove the users or admin from the org
    await organization.updateOne({
      updatedBy: user._id,
      $pull: {
        users: Types.ObjectId(userIdToDelete)
      }
    }).orFail();

    //now we need to remove the org from each of the users removed
    await this.userModel.findByIdAndUpdate(userIdToDelete, {
      $pull: {
        organizations: organization._id
      }
    }).orFail();


    //now let's emit our event to notify users/admins were removed
    let orgUserDeletedEvt: IOrganizationUserDeletedEvent = {
      organization: organization,
      user: user,
      deletedUser: userIdToDelete
    }


    this.eventEmitter.emit(
      OrganizationEvents.userDeleted,
      orgUserDeletedEvt
    )

    //FINALLY let's return the updated org
    return {
      _id: organization._id,
      users: organization.users,
    }

  }
}


/**
 * Service class for Organization Admin management
 * 
 */

 @Injectable()
 export class OrganizationAdminService {
   constructor(
     @Inject(InjectedConstants.organization_model) private organizationModel: Model<IOrganization>,
     @Inject(InjectedConstants.user_model) private userModel: Model<IUser>,
     private eventEmitter: EventEmitter2,
     private organizationPermissions: OrganizationPermissions,
     private readonly logger: Logger,
   ) {}
 
   /**
    * 
    * @param organizationId - Org Id passed to path
    * @param user - IUserToken
    * @permission - requires that the user supplied by the token be either an admin or a user of the organization
    * @returns Finds all users that belong to an organization and returns them.  Will return an object containing the admins array and the users array
    */
   async findAll(organizationId: string, user: IUserToken) {
 
     //first let's grab our doc
     const organization = await this.organizationModel.findById(organizationId).orFail();
 
     //now, let's verify if the user has permission to view.  Either an admin or user of the org needs READ
     if (!this.organizationPermissions.checkPermission(Action.Read, organization, user)) {
       console.log(user)
       let err = new Error('Error - you have insufficient privileges to view this organization');
       err['code'] = Errors.Forbidden
       throw err;
     }
 
     //let's populate our users to grab the emails/any other info
     await organization.populate('admins', '_id email').execPopulate();
 
     //let's return the users and admins of the org
     return {
       _id: organization._id,
       admins: organization.admins
     }
   }
 
   /**
    * Updates the admin list of an organization to ONLY ADD new users.  
    * 
    * @param organizationId 
    * @param UpdateOrganizationUsersDto 
    * @param user
    * @event releases org users updated event 
    * @permission requires admin access to the organization
    * @returns returns the updated users/admins list on the named org
    */
   async update(organizationId: string, updateOrganizationAdminsDto: UpdateOrganizationAdminsDto, user: IUserToken) {
     
    //let's retrieve our org and make sure it exists
    const organization = await this.organizationModel.findOne({ _id: organizationId }).orFail();

    //check permissions - you MUST be an admin to update these lists
    if (!this.organizationPermissions.checkPermission(Action.Update, organization, user)) {
      let err = new Error('Error - you have insufficient privileges to update this organization.');
      err['code'] = Errors.Forbidden;
       throw err;
     }
 
    //let's build our update DAO
    //we'll want to add the user to the org as both an admin and a user
    let updateOrgAdminsDao = {
      $addToSet: {
        admins: { $each: updateOrganizationAdminsDto.admins },
        users: { $each: updateOrganizationAdminsDto.admins },
      },
      updatedBy: user._id
    }
 
    //let's use addToSet to push these new users or admins to our array
    await organization.updateOne(updateOrgAdminsDao, { new: true })

    //now let's add the organization as an org to the users updated
    //we don't care about order that these run in, just that they all finish.  We'll run them in parallel
    await Promise.all(updateOrganizationAdminsDto.admins.map((adminId) => {
      return this.userModel.findByIdAndUpdate(adminId, {
        $addToSet: { organizations: organization._id },
      })
    }));

 
    //let's emit our admin updated events
    updateOrganizationAdminsDto.admins.forEach((admin) => {
      this.eventEmitter.emit(
        OrganizationEvents.updated,
        {
          organization: organization,
          user: user,
          updatedAdmin: admin,
        }
      )
    })
     
 
 
     return {
       _id: organization._id,
       admins: organization.admins
     }
     
   }
 
   /**
    * deletes a singular admin based on user and organization passed into the route param
    * 
    * @param organizationId 
    * @param userIdToDelete 
    * @param user 
    * @event emits the organizationUserDeleted event
    * @permission Requires that the user requesting the action be an admin for the organization
    * @returns Returns the updated list of users for an organization post-delete
    */
   async remove(organizationId: string, adminIdToDelete: string, user: IUserToken) {
 
     //first, let's grab our organization
     const organization = await this.organizationModel.findById(organizationId).orFail();
 
     //let's see if we have permission to remove the users (aka is an admin)
     if (!this.organizationPermissions.checkPermission(Action.Delete, organization, user)) {
       let err = new Error('You have insufficient privileges to update/modify this organization.');
       err['code'] = Errors.Forbidden;
       throw err;
     }
 
     //let's make sure we aren't removing the last admin.  Instead, they would need to delete the org.
     //we only want to be able to remove 1 admin at a time - this will be a safety check for us
     if (organization.admins.length === 1) {
       let err = new Error("Error - you can't remove the last admin from an organization.  Did you want to delete the organization instead?");
       err['code'] = Errors.ActionNotAllowed;
       throw err;
     }
 
     //lets run update query to remove the users or admin from the org
     await organization.updateOne({
       updatedBy: user._id,
       $pull: {
         admins: Types.ObjectId(adminIdToDelete)
       }
     }).orFail();
     
     //since you can't remove a user that is still an admin, the user removal will come last.  Thus, we can ignore removing this org from the user document
 
     //now let's emit our event to notify users/admins were removed
     let orgUserDeletedEvt: IOrganizationAdminDeletedEvent = {
       organization: organization,
       user: user,
       deletedAdmin: adminIdToDelete
     }
 
 
     this.eventEmitter.emit(
       OrganizationEvents.userDeleted,
       orgUserDeletedEvt
     )
 
     //FINALLY let's return the updated org
     return {
       _id: organization._id,
       admins: organization.admins,
     }
 
   }
 }