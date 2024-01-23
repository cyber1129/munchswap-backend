import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelBuyNowOfferDto {
  @ApiProperty({
    example: '2bea0983-f47f-4166-9477-42dc3ceeb45f',
    required: false,
    minimum: 1,
    maximum: 40,
    description: 'uuid',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  uuid: string;
}
