import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { SignMessage } from './sign-message.entity';

@EventSubscriber()
export class SignMessageSubscriber
  implements EntitySubscriberInterface<SignMessage>
{
  listenTo(): any {
    return SignMessage;
  }

  beforeInsert(event: InsertEvent<SignMessage>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<SignMessage>): void {
    event.entity.updatedAt = new Date();
  }
}
