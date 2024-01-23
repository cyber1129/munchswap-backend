import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { SignMessage } from './sign-message.entity';

@Injectable()
export class SignMessageRepository extends Repository<SignMessage> {
  constructor(private readonly dataSource: DataSource) {
    super(SignMessage, dataSource.manager);
  }
}
