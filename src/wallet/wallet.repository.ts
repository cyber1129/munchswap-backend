import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Wallet } from './wallet.entity';

@Injectable()
export class WalletRepository extends Repository<Wallet> {
  constructor(private readonly dataSource: DataSource) {
    super(Wallet, dataSource.manager);
  }
}
