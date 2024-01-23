import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { Friend } from './friend.entity';

@EventSubscriber()
export class FriendSubscriber implements EntitySubscriberInterface<Friend> {
  listenTo(): any {
    return Friend;
  }

  beforeInsert(event: InsertEvent<Friend>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<Friend>): void {
    event.entity.updatedAt = new Date();
  }
}
