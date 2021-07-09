import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateOrganizationUserDto {
	@ApiProperty({ type: String })
	@IsEmail()
	@IsNotEmpty()
	userEmail: string;
}
