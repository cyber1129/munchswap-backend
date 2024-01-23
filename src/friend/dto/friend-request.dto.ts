import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class FriendRequestDto {
  @ApiProperty({
    example: 'tb1pn952y2hrpzf9gfnmsg0zht2smhn2lrzxz569vtpt23aj8wqgndmsc4g58d',
    required: false,
    minimum: 1,
    maximum: 80,
    description: 'User Address',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  userAddress: string;
}
