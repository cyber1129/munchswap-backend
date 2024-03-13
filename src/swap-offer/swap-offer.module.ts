import { Module } from '@nestjs/common';

import { InscriptionModule } from '@src/inscription/inscription.module';
import { InscriptionService } from '@src/inscription/inscription.service';
import { UserModule } from '@src/user/user.module';
import { PsbtModule } from '@src/psbt/psbt.module';
import { PsbtService } from '@src/psbt/psbt.service';
import { SwapOfferService } from './swap-offer.service';
import { SwapOfferController } from './swap-offer.controller';
import { SwapOfferRepository } from './swap-offer.repository';
import { BuyerSwapInscription } from './buyer-swap-inscription.entity';
import { BuyerSwapInscriptionRepository } from './buyer-swap-inscription.repository';
import { SellerSwapInscriptionRepository } from './seller-swap-inscription.repository';
import { WalletModule } from '@src/wallet/wallet.module';
import { WalletService } from '@src/wallet/wallet.service';

@Module({
  imports: [InscriptionModule, UserModule, PsbtModule, WalletModule],
  providers: [
    SwapOfferService,
    SwapOfferRepository,
    BuyerSwapInscriptionRepository,
    SellerSwapInscriptionRepository,
    InscriptionService,
    PsbtService,
    BuyerSwapInscription,
    WalletService
  ],
  controllers: [SwapOfferController],
})
export class SwapOfferModule {}
