import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

import { PageOptionsDto } from '@src/common/pagination/pagination.types';
import { Type } from 'class-transformer';

export class GetUserPointDto extends PageOptionsDto {
  @ApiPropertyOptional({
    minimum: 1,
    default: -1,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  time?: number = -1;
}
