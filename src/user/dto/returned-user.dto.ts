import { ApiProperty } from '@nestjs/swagger';

export class ReturnedUserDto {
	@ApiProperty({
		description: 'A unique ID belonging to the user.',
	})
	_id: string;

	@ApiProperty({
		description: 'The email address registered to the user.',
	})
	email: string;
}
