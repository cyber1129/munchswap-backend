import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { SwapInscription } from './swap-inscription.entity';

@EventSubscriber()
export class SwapInscriptionSubscriber
  implements EntitySubscriberInterface<SwapInscription>
{
  listenTo(): any {
    return SwapInscription;
  }

  beforeInsert(event: InsertEvent<SwapInscription>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<SwapInscription>): void {
    event.entity.updatedAt = new Date();
  }
}
