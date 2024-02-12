import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { PageOptionsDto } from '@src/common/pagination/pagination.types';

export class GetOfferDto extends PageOptionsDto {
  @ApiProperty({
    example: 'block',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Inscription Id or Address',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  keyword?: string;
}
