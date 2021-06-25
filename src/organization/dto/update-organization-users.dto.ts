import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';

export class UpdateOrganizationUsersDto {
	@ApiProperty({ type: [String], isArray: true })
	@IsArray()
	@IsNotEmpty()
	@IsObjectId({
		each: true,
		message: "User ID's must be valid instances of a User ID ObjectID",
	})
	users: Array<string>;
}
