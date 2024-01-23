import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { SwapOffer } from './swap-offer.entity';

@EventSubscriber()
export class SwapOfferSubscriber
  implements EntitySubscriberInterface<SwapOffer>
{
  listenTo(): any {
    return SwapOffer;
  }

  beforeInsert(event: InsertEvent<SwapOffer>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<SwapOffer>): void {
    event.entity.updatedAt = new Date();
  }
}
