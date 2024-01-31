import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BuyerSwapInscription } from './buyer-swap-inscription.entity';

@Injectable()
export class BuyerSwapInscriptionRepository extends Repository<BuyerSwapInscription> {
  constructor(private readonly dataSource: DataSource) {
    super(BuyerSwapInscription, dataSource.manager);
  }
}
