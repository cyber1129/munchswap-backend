import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { Point } from './point.entity';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<Point> {
  listenTo(): any {
    return Point;
  }

  beforeInsert(event: InsertEvent<Point>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<Point>): void {
    event.entity.updatedAt = new Date();
  }
}
