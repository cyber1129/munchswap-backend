import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { BuyerSwapInscription } from './buyer-swap-inscription.entity';

@EventSubscriber()
export class BuyerSwapInscriptionSubscriber
  implements EntitySubscriberInterface<BuyerSwapInscription>
{
  listenTo(): any {
    return BuyerSwapInscription;
  }

  beforeInsert(event: InsertEvent<BuyerSwapInscription>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<BuyerSwapInscription>): void {
    event.entity.updatedAt = new Date();
  }
}
