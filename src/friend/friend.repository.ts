import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { Friend } from './friend.entity';

@Injectable()
export class FriendRepository extends Repository<Friend> {
  constructor(private readonly dataSource: DataSource) {
    super(Friend, dataSource.manager);
  }
}
