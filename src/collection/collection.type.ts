import { ApiProperty } from '@nestjs/swagger';
import { PageDto } from '@src/common/pagination/pagination.types';

export class CollectionId {
  @ApiProperty({ description: `Inscription Id` })
  inscriptionId: string;
}

export class InscriptionIdData {
  @ApiProperty({ isArray: true, description: `Inscription id data` })
  data: CollectionId[];
}

export class BasicCollectionInfo {
  @ApiProperty({ description: `Collection name` })
  name: string;

  @ApiProperty({ description: `Collection description` })
  description: string;

  @ApiProperty({ description: `Collection Image Url` })
  imgUrl: string;
}

export class DiscoverCollection extends BasicCollectionInfo {
  @ApiProperty({ description: `Some inscription ids of this collection` })
  inscriptions: InscriptionIdData;

  @ApiProperty({ description: `Number of inscriptions in this collection` })
  itemCount: number;

  @ApiProperty({ description: `Floor price in this collection` })
  floorPrice: number;
}

export class PriceInscriptionInfo {
  @ApiProperty({ description: `Inscription Id` })
  inscriptionId: string;

  @ApiProperty({ description: `Inscription price` })
  price?: string;

  @ApiProperty({ description: `Inscription owner address` })
  userAddress?: string;
}

export class CollectionInscriptions extends BasicCollectionInfo {
  @ApiProperty({ description: `Inscription information` })
  inscriptions: PageDto<PriceInscriptionInfo>;

  @ApiProperty({ description: `Collection website url` })
  website?: string;

  @ApiProperty({ description: `Collection website url` })
  twitter?: string;

  @ApiProperty({ description: `Collection website url` })
  discord?: string;
}

export class PopularCollection extends BasicCollectionInfo {
  @ApiProperty({ description: `Floor price in this collection` })
  floorPrice: number;
}

export class CollectionDetailedInfo {
  @ApiProperty({ description: `Collection total count` })
  totalCount: number;

  @ApiProperty({ description: `Collection listed item count` })
  listedItems: number;

  @ApiProperty({ description: `Collection floor price` })
  floorPrice: number;

  @ApiProperty({ description: `Collection total sales` })
  totalSales: number;
}
