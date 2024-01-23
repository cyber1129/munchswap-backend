import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PageOptionsDto } from '@src/common/pagination/pagination.types';

export class GetTopSellersPageDto extends PageOptionsDto {
  @ApiProperty({
    example: '7',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Time',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  time: number = 7;

  @ApiProperty({
    example: 'block',
    required: true,
    minimum: 1,
    maximum: 128,
    description: 'user name',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  keyword?: string;
}
