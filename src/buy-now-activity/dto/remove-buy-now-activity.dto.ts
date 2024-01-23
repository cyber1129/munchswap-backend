import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RemoveBuyNowActivityDto {
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
}
