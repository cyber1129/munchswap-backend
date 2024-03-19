import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    example: 'John Doe',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Display name',
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(128)
  name: string;

  @ApiProperty({
    example:
      'cd16b907b5df2a083b6c03911f4bed57d1ab42de4cc4feadb7162b144dcba010i0',
    required: false,
    maximum: 255,
    description: 'Avatar inscription',
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(128)
  avatar: string;

  @ApiProperty({
    example: 'My ...',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Bio',
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  bio: string;
}
