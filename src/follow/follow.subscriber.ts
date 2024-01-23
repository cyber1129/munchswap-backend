import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { Follow } from './follow.entity';

@EventSubscriber()
export class FollowSubscriber implements EntitySubscriberInterface<Follow> {
  listenTo(): any {
    return Follow;
  }

  beforeInsert(event: InsertEvent<Follow>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<Follow>): void {
    event.entity.updatedAt = new Date();
  }
}
