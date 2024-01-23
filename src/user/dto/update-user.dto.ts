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
  @MinLength(1)
  @MaxLength(128)
  name: string;

  @ApiProperty({
    example: 'user@example.com',
    required: false,
    maximum: 255,
    description: 'E-mail',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'My ...',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Bio',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  bio: string;

  @ApiProperty({
    example: 'https://',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Website',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  website: string;

  @ApiProperty({
    example: 'https://',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Twitter',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  twitter: string;

  @ApiProperty({
    example: 'https://',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Facebook',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  facebook: string;

  @ApiProperty({
    example: 'tb1pn952y2hrpzf9gfnmsg0zht2smhn2lrzxz569vtpt23aj8wqgndmsc4g58d',
    required: true,
    minimum: 1,
    maximum: 128,
    description: 'Wallet payment Address',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  paymentAddress: string;
}
