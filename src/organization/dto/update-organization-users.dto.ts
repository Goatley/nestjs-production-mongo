import { IsArray, IsNotEmpty, IsOptional } from "class-validator";
import { IsObjectId } from "class-validator-mongo-object-id";

export class UpdateOrganizationUsersDto {
    @IsArray()
    @IsNotEmpty()
    @IsObjectId({
        each: true,
        message: "User ID's must be valid instances of a User ID ObjectID"
    })
    users: Array<string>;
}