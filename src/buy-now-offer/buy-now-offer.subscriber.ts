import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';

import { BuyNowOffer } from './buy-now-offer.entity';

@EventSubscriber()
export class BuyNowOfferSubscriber
  implements EntitySubscriberInterface<BuyNowOffer>
{
  listenTo(): any {
    return BuyNowOffer;
  }

  beforeInsert(event: InsertEvent<BuyNowOffer>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<BuyNowOffer>): void {
    event.entity.updatedAt = new Date();
  }
}
