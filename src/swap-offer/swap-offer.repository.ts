import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { SwapOffer } from './swap-offer.entity';

@Injectable()
export class SwapOfferRepository extends Repository<SwapOffer> {
  constructor(private readonly dataSource: DataSource) {
    super(SwapOffer, dataSource.manager);
  }
}
