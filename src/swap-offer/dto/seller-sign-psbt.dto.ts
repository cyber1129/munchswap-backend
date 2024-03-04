import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

import { WalletTypes } from '@src/user/user.entity';

export class SellerSignPsbtDto {
  @ApiProperty({
    example:
      '2c96d4c9-8a7d-48b9-881d-584b92ba13c2',
    required: false,
    minimum: 1,
    maximum: 5000,
    description: 'Unsigned Psbt',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  offerId: string;

  @ApiProperty({
    example:
      '032d5536574e87d1e394219d536e8e2087cfa0de3787e49820315bdcb291ef6723',
    required: false,
    minimum: 1,
    maximum: 5000,
    description: 'Seller signed Psbt',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  signedPsbt: string;

  @ApiProperty({
    example: 'Unisat',
    required: false,
    minimum: 1,
    maximum: 128,
    description: 'Seller wallet type',
  })
  @IsEnum(WalletTypes)
  walletType: WalletTypes;
}
