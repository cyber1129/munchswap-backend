import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { WalletTypes } from '@src/user/user.entity';

export class GenerateSwapPsbtDto {
  @ApiProperty({
    example:
      'e19eea22dc6f6fc16c5a6aad4f6c7bdfe16733def97be0f6cb1c5d12ede37dbfi0',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Buyer Inscription Id',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  buyerInscriptionIds: string[];

  @ApiProperty({
    example:
      'e19eea22dc6f6fc16c5a6aad4f6c7bdfe16733def97be0f6cb1c5d12ede37dbfi0',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Buyer Inscription Id',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  sellerInscriptionIds: string[];

  @ApiProperty({
    example:
      '032d5536574e87d1e394219d536e8e2087cfa0de3787e49820315bdcb291ef6723',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Buyer Public key to pay',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  buyerPubkey: string;

  @ApiProperty({
    example: 'Unisat',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Buyer wallet type',
  })
  @IsEnum(WalletTypes)
  walletType: WalletTypes;

  @ApiProperty({
    example: '0.0002',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Add price',
  })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({
    example: '30m',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Expired time',
  })
  @IsIn(['30m', '1h', '6h', '1d', '7d'])
  expiredIn: string;
}
