import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { Inscription } from './inscription.entity';

@EventSubscriber()
export class InscriptionSubscriber
  implements EntitySubscriberInterface<Inscription>
{
  listenTo(): any {
    return Inscription;
  }

  beforeInsert(event: InsertEvent<Inscription>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<Inscription>): void {
    event.entity.updatedAt = new Date();
  }
}
