import { Module } from '@nestjs/common';

import { InscriptionModule } from '@src/inscription/inscription.module';
import { InscriptionService } from '@src/inscription/inscription.service';
import { BuyNowActivityModule } from '@src/buy-now-activity/buy-now-activity.module';
import { BuyNowActivityService } from '@src/buy-now-activity/buy-now-activity.service';
import { UserModule } from '@src/user/user.module';
import { PsbtModule } from '@src/psbt/psbt.module';
import { PsbtService } from '@src/psbt/psbt.service';
import { SwapInscriptionRepository } from './swap-inscription.repository';
import { SwapOfferService } from './swap-offer.service';
import { SwapOfferController } from './swap-offer.controller';
import { SwapOfferRepository } from './swap-offer.repository';

@Module({
  imports: [InscriptionModule, BuyNowActivityModule, UserModule, PsbtModule],
  providers: [
    SwapOfferService,
    SwapOfferRepository,
    SwapInscriptionRepository,
    InscriptionService,
    BuyNowActivityService,
    PsbtService,
  ],
  controllers: [SwapOfferController],
})
export class SwapOfferModule {}
