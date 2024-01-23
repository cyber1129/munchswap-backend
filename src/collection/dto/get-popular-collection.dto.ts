import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GetPopularCollectionDto {
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
  time: number = 1;
}
