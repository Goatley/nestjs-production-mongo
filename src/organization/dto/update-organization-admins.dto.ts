import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';

export class UpdateOrganizationAdminsDto {
	@ApiProperty({ type: String })
	@IsNotEmpty()
	@IsObjectId({
		each: true,
		message: "User ID's must be valid instances of a User ID ObjectID",
	})
	adminId: string;
}
