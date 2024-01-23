import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetBuyNowOfferAsReadDto {
  @ApiProperty({
    example: '	bcf91e49-e732-4304-9dfb-7a86047cb6d4',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'buy now offer uuid',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  uuid: string;
}
