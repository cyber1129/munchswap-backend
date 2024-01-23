import { Module } from '@nestjs/common';

import { UserModule } from '@src/user/user.module';
import { UserService } from '@src/user/user.service';
import { InscriptionModule } from '@src/inscription/inscription.module';
import { InscriptionService } from '@src/inscription/inscription.service';
import { BuyNowActivityController } from './buy-now-activity.controller';
import { BuyNowActivityService } from './buy-now-activity.service';
import { BuyNowActivityRepository } from './buy-now-activity.repository';

@Module({
  imports: [UserModule, InscriptionModule],
  controllers: [BuyNowActivityController],
  providers: [
    BuyNowActivityService,
    BuyNowActivityRepository,
    UserService,
    InscriptionService,
  ],
  exports: [BuyNowActivityService, BuyNowActivityRepository],
})
export class BuyNowActivityModule {}
