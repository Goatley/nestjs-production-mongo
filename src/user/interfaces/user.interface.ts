import * as mongoose from 'mongoose'


export interface IUser extends mongoose.Document {
    email: string;
    organizations: Array<mongoose.Types.ObjectId>,
    // projects: [{ type: mongoose.Types.ObjectId, ref: 'Project' }]
    projects: Array<string>
}

export interface IUserToken {
    _id: mongoose.Types.ObjectId;
    email: string;
    permissions: Array<string>;
}