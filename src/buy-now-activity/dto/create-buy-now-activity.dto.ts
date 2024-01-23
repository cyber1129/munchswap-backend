import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBuyNowActivityDto {
  @ApiProperty({
    example:
      'e19eea22dc6f6fc16c5a6aad4f6c7bdfe16733def97be0f6cb1c5d12ede37dbfi0',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Inscription Id',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  inscriptionId: string;

  @ApiProperty({
    example: 0.003,
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Price',
  })
  @IsNumber()
  price: number;
}
