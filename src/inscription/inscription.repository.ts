import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Inscription } from './inscription.entity';

@Injectable()
export class InscriptionRepository extends Repository<Inscription> {
  constructor(private readonly dataSource: DataSource) {
    super(Inscription, dataSource.manager);
  }
}
