import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { v4 as uuid } from 'uuid';
import { SellerSwapInscription } from './seller-swap-inscription.entity';

@EventSubscriber()
export class SellerSwapInscriptionSubscriber
  implements EntitySubscriberInterface<SellerSwapInscription>
{
  listenTo(): any {
    return SellerSwapInscription;
  }

  beforeInsert(event: InsertEvent<SellerSwapInscription>): void | Promise<any> {
    if (!event.entity.uuid) {
      event.entity.uuid = uuid();
    }
  }

  beforeUpdate(event: UpdateEvent<SellerSwapInscription>): void {
    event.entity.updatedAt = new Date();
  }
}
