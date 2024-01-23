import { ApiProperty } from '@nestjs/swagger';

export class UserInfo {
  @ApiProperty({ description: `User name` })
  name: string;

  @ApiProperty({ description: `User address` })
  address: string;
}

export class CollectionInfo {
  @ApiProperty({ description: `Collection name` })
  name: string;

  @ApiProperty({ description: `Collection description` })
  description: string;

  @ApiProperty({ description: `Collection Image url` })
  imgUrl: string;
}

class InscriptionInfo {
  @ApiProperty({ description: `Inscription id` })
  inscriptionId: string;

  @ApiProperty({ description: `Collection info` })
  collection: CollectionInfo;
}

export class CreateBuyNowActivity {
  @ApiProperty({ description: `Listed inscription price` })
  price: number;

  @ApiProperty({ description: `Inscription Id` })
  inscriptionId: string;
}

export class RemoveBuyNowActivity {
  @ApiProperty({ description: `Result` })
  res: string;
}

export class BuyNowActivityPrice {
  @ApiProperty({ description: `Inscription Price` })
  price: number;
}

export class BuyNowActivityInfo {
  @ApiProperty({ description: `Listed inscription price` })
  price: number;

  @ApiProperty({ description: `Inscription info` })
  inscription: InscriptionInfo;
}

export class BuyNowActivityInscriptionInfo extends BuyNowActivityInfo {
  @ApiProperty({ description: `User info` })
  user: UserInfo;
}

export class BuyNowPercentFeeRate {
  @ApiProperty({ description: `Percent fee rate` })
  feePercent: number;
}

export class RecentUserInfo extends UserInfo {
  @ApiProperty({ description: `User total sales amount` })
  totalSales: number;
}
