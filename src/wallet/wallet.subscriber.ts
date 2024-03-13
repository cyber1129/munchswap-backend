import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { Wallet } from './wallet.entity';

@EventSubscriber()
export class WalletSubscriber implements EntitySubscriberInterface<Wallet> {
  listenTo(): any {
    return Wallet;
  }

  beforeInsert(event: InsertEvent<Wallet>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<Wallet>): void {
    event.entity.updatedAt = new Date();
  }
}
