import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { GetOfferDto } from './get-offer.dto';
import { OfferStatus } from '../swap-offer.entity';

export class GetUserHistoryDto extends GetOfferDto {
  @ApiProperty({
    example: 'pushed',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Status of offer',
  })
  @IsString()
  @IsIn(['canceled', 'pending', 'pushed', 'expired', 'failed'])
  @IsOptional()
  status?: OfferStatus;
}
