import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationEvents } from '../events/organization.events';
import { IUser, IUserToken } from 'src/user/interfaces/user.interface';
import { Errors } from 'src/config/errors';
import { OrganizationPermissions } from '../permissions/organization.permissions';
import { Action } from 'src/casl/actions';
import { IOrganization, IOrganizationEvent } from '../interfaces/organization.interface';
import { InjectedConstants } from 'src/config/constants.config';

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





