import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { SellerSwapInscription } from './seller-swap-inscription.entity';

@Injectable()
export class SellerSwapInscriptionRepository extends Repository<SellerSwapInscription> {
  constructor(private readonly dataSource: DataSource) {
    super(SellerSwapInscription, dataSource.manager);
  }
}
