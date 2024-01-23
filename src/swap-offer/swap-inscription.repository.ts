import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { SwapInscription } from './swap-inscription.entity';

@Injectable()
export class SwapInscriptionRepository extends Repository<SwapInscription> {
  constructor(private readonly dataSource: DataSource) {
    super(SwapInscription, dataSource.manager);
  }
}
