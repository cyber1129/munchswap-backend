import { Module } from '@nestjs/common';

import { InscriptionModule } from '@src/inscription/inscription.module';
import { InscriptionService } from '@src/inscription/inscription.service';
import { BuyNowActivityModule } from '@src/buy-now-activity/buy-now-activity.module';
import { BuyNowActivityService } from '@src/buy-now-activity/buy-now-activity.service';
import { UserModule } from '@src/user/user.module';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { CollectionRepository } from './colletion.repository';

@Module({
  imports: [InscriptionModule, BuyNowActivityModule, UserModule],
  controllers: [CollectionController],
  providers: [
    CollectionService,
    CollectionRepository,
    InscriptionService,
    BuyNowActivityService,
  ],
  exports: [CollectionService],
})
export class CollectionModule {}
