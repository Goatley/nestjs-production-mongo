import { Injectable, Inject } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { IUser } from './interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectedConstants } from 'src/config/constants.config';

@Injectable()
export class UserService {
  constructor(@Inject(InjectedConstants.user_model) private userModel: Model<IUser>,) {}

  async create(createUserDto: CreateUserDto) {

    //first create our data access object
    //convert auth0 unique ID to mongoDB objectId type
    const createUserDao = {
      _id: Types.ObjectId(createUserDto._id.substr(6)),
      email: createUserDto.email
    }

    return await this.userModel.create(createUserDao);
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: string) {
    return `looking for user ${id}`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
