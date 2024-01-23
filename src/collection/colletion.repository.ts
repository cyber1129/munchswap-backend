import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Collection } from './collection.entity';

@Injectable()
export class CollectionRepository extends Repository<Collection> {
  constructor(private readonly dataSource: DataSource) {
    super(Collection, dataSource.manager);
  }
}
