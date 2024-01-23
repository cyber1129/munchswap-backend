import { PageOptionsDto } from '@src/common/pagination/pagination.types';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class GetPaginatedInscriptionFilterDto extends PageOptionsDto {
  @IsString()
  @IsOptional()
  @MinLength(4)
  search: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  time: number = 7;

  @IsString()
  @IsIn(['time', 'price', 'collection', 'user'])
  @IsOptional()
  orderBy: string = 'time';
}
