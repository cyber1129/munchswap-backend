import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { BuyNowOffer } from './buy-now-offer.entity';

@Injectable()
export class BuyNowOfferRepository extends Repository<BuyNowOffer> {
  constructor(private readonly dataSource: DataSource) {
    super(BuyNowOffer, dataSource.manager);
  }
}
