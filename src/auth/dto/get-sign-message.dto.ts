import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class GetSignMessageDto {
  @ApiProperty({
    example: 'tb1pn952y2hrpzf9gfnmsg0zht2smhn2lrzxz569vtpt23aj8wqgndmsc4g58d',
    required: true,
    minimum: 1,
    maximum: 128,
    description: 'Wallet Address',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  address: string;
}
