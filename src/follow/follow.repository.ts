import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Follow } from './follow.entity';

@Injectable()
export class FollowRepository extends Repository<Follow> {
  constructor(private readonly dataSource: DataSource) {
    super(Follow, dataSource.manager);
  }
}
