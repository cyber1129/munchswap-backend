import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchDto {
  @ApiProperty({
    example: 'block',
    required: true,
    minimum: 1,
    maximum: 128,
    description: 'Inscription Id',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  keyword: string;
}
