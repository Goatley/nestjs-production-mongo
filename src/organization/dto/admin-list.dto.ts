import { ReturnedUserDto } from '../../user/dto/returned-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class AdminListDto {
	@ApiProperty({
		description: 'The unique ID of the organization.',
	})
	_id: Types.ObjectId;

	@ApiProperty({
		description: 'An array of users that belong to the organization',
		isArray: true,
	})
	admins: Array<ReturnedUserDto>;
}
