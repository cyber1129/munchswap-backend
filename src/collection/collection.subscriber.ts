import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { Collection } from './collection.entity';

@EventSubscriber()
export class CollectionSubscriber
  implements EntitySubscriberInterface<Collection>
{
  listenTo(): any {
    return Collection;
  }

  beforeInsert(event: InsertEvent<Collection>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<Collection>): void {
    event.entity.updatedAt = new Date();
  }
}
