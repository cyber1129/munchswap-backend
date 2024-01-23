import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { BuyNowActivity } from './buy-now-activity.entity';

@Injectable()
export class BuyNowActivityRepository extends Repository<BuyNowActivity> {
  constructor(private readonly dataSource: DataSource) {
    super(BuyNowActivity, dataSource.manager);
  }
}
