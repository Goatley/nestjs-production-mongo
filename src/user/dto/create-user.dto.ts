import {  IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    _id: string;

    @IsNotEmpty()
    @IsString()
    email: string;

    @IsOptional()
    organizations?: Array<string>;

    @IsOptional()
    projects?: Array<string>;
}
