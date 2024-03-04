import { ApiProperty } from '@nestjs/swagger';
import { WalletTypes } from '@src/user/user.entity';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    example: 'tb1pn952y2hrpzf9gfnmsg0zht2smhn2lrzxz569vtpt23aj8wqgndmsc4g58d',
    required: true,
    minimum: 1,
    maximum: 128,
    description: 'Wallet Address',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  address: string;

  @ApiProperty({
    example:
      '032b6dc2ca805cf1602be02ea992e29772ff4b3575b3ac464692077d885afb6870',
    required: true,
    minimum: 1,
    maximum: 128,
    description: 'Public Key',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  pubkey: string;

  @ApiProperty({
    example: 'tb1pn952y2hrpzf9gfnmsg0zht2smhn2lrzxz569vtpt23aj8wqgndmsc4g58d',
    required: true,
    minimum: 1,
    maximum: 128,
    description: 'Wallet Address',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  paymentAddress: string;

  @ApiProperty({
    example:
      '032b6dc2ca805cf1602be02ea992e29772ff4b3575b3ac464692077d885afb6870',
    required: true,
    minimum: 1,
    maximum: 128,
    description: 'Public Key',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  paymentPubkey: string;

  @ApiProperty({
    example: '123456....',
    required: true,
    maximum: 255,
    description: 'signature',
  })
  @MaxLength(255)
  signature: string;

  @ApiProperty({
    example: 'Unisat',
    required: true,
    maximum: 255,
    description: 'Wallet type',
  })
  @IsEnum(WalletTypes)
  walletType: WalletTypes;
}
