import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, Injectable } from '@nestjs/common';
import { testnet, bitcoin, Network } from 'bitcoinjs-lib/src/networks';

import { WalletTypes } from '@src/user/user.entity';
import { InscriptionService } from '@src/inscription/inscription.service';
import { PsbtService } from '@src/psbt/psbt.service';
import { UserService } from '@src/user/user.service';
import { BuyerSignPsbtDto } from './dto/buyer-sign-psbt.dto';
import { OwnerSignPsbtDto } from './dto/owner-sign-psbt.dto';
import {
  PageDto,
  PageMetaDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { SwapOfferRepository } from './swap-offer.repository';
import { OfferStatus } from './swap-offer.entity';

@Injectable()
export class SwapOfferService {
  private network: Network;

  constructor(
    private swapOfferRepository: SwapOfferRepository,
    private psbtService: PsbtService,
    private userService: UserService,
    private configService: ConfigService,
  ) {
    const networkType = this.configService.get('psbtConfig.network');

    if (networkType === 'mainnet') this.network = bitcoin;
    else this.network = testnet;
  }

  // async generatePsbt({
  //   buyerInscriptionIds,
  //   sellerInscriptionIds,
  //   buyer,
  //   buyerPubkey,
  //   walletType,
  //   price = 0,
  //   expiredIn,
  // }: {
  //   buyerInscriptionIds: string[];
  //   sellerInscriptionIds: string[];
  //   buyer: string;
  //   buyerPubkey: string;
  //   walletType: WalletTypes;
  //   price?: number;
  //   expiredIn: string;
  // }) {
  //   const user = await this.userService.findByAddress(buyer);

  //   const { psbt, inputCount } = await this.psbtService.generateSwapPsbt({
  //     ownerPubkey: user.pubkey,
  //     buyerPaymentPubkey: buyerPubkey,
  //     buyerTaprootPubkey: user.pubkey,
  //     walletType,
  //     recipient,
  //     network: this.network,
  //     sellerInscriptionId,
  //     buyerInscriptionIds,
  //     price: price * 10 ** 8,
  //     ownerWalletType: txData.walletType,
  //     buyerWalletType: user.walletType,
  //     ownerPaymentAddress: txData.paymentAddress,
  //   });

  //   const inscriptions = await this.inscriptionService.findInscriptionByIds(
  //     buyerInscriptionIds,
  //   );

  //   const expiredAt = new Date();
  //   const time = expiredIn.match(/\d+/)[0];

  //   if (expiredIn.endsWith('m')) {
  //     const minutes = expiredAt.getMinutes();
  //     expiredAt.setMinutes(minutes + Number(time));
  //   } else if (expiredIn.endsWith('h')) {
  //     const hours = expiredAt.getHours();
  //     expiredAt.setHours(hours + Number(time));
  //   } else if (expiredIn.endsWith('d')) {
  //     const date = expiredAt.getDate();
  //     expiredAt.setHours(date + Number(time));
  //   }

  //   const swapOffer = this.swapOfferRepository.create({
  //     buyNowActivityId: [txData.buyNowActivityId],
  //     price: price,
  //     status: OfferStatus.CREATED,
  //     psbt,
  //     user,
  //     expiredAt,
  //   });

  //   const savedSwapOffer = await this.swapOfferRepository.save(swapOffer);

  //   await Promise.all(
  //     inscriptions.map((inscription) =>
  //       this.swapInscriptionRepository.save({
  //         inscriptionId: inscription.id,
  //         swap_offer_id: savedSwapOffer.id,
  //       }),
  //     ),
  //   );

  //   if (walletType === WalletTypes.XVERSE) {
  //     const base64Psbt = this.psbtService.convertHexedToBase64(psbt);
  //     return { psbt: base64Psbt, inputCount };
  //   }

  //   return { psbt, inputCount };
  // }

  // async cancelSwapOffer(uuid: string, address: string): Promise<boolean> {
  //   const user = await this.userService.findByAddress(address);

  //   const swapOffer = await this.swapOfferRepository.findOne({
  //     where: {
  //       uuid,
  //     },
  //   });

  //   if (!swapOffer)
  //     throw new BadRequestException('Can not find the buy now offer');

  //   if (swapOffer.userId !== user.id)
  //     throw new BadRequestException('You can not cancel the offer');

  //   await this.swapOfferRepository.update(
  //     {
  //       uuid,
  //     },
  //     { status: OfferStatus.CANCELED },
  //   );

  //   return true;
  // }

  // async buyerSignPsbt(body: BuyerSignPsbtDto, userAddress: string) {
  //   const user = await this.userService.findByAddress(userAddress);

  //   const swapOffer = await this.swapOfferRepository.findOne({
  //     where: { psbt: body.psbt, userId: user.id },
  //   });

  //   if (!swapOffer)
  //     throw new BadRequestException('Can not find that swap offer');

  //   const signedPsbt = body.signedPsbt;

  //   await this.swapOfferRepository.update(
  //     { psbt: body.psbt },
  //     {
  //       buyerSignedPsbt: signedPsbt,
  //       status: OfferStatus.SIGNED,
  //     },
  //   );

  //   return true;
  // }

  // async ownerSignPsbt(
  //   body: OwnerSignPsbtDto,
  //   userAddress: string,
  // ): Promise<string> {
  //   const user = await this.userService.findByAddress(userAddress);

  //   let psbt = body.psbt;
  //   if (body.walletType === WalletTypes.XVERSE) {
  //     psbt = this.psbtService.convertBase64ToHexed(body.psbt);
  //   }

  //   const swapOffer = await this.swapOfferRepository.findOne({
  //     where: {
  //       psbt,
  //       buyNowActivity: { userId: user.id },
  //       deletedAt: null,
  //     },
  //     relations: {
  //       swapInscription: true,
  //     },
  //   });

  //   if (!swapOffer)
  //     throw new BadRequestException('Can not find that swap now offer');

  //   let signedPsbt = body.signedPsbt;
  //   if (user.walletType === WalletTypes.HIRO) {
  //     signedPsbt = this.psbtService.finalizePsbtInput(body.signedPsbt, [0]);
  //   } else if (body.walletType === WalletTypes.XVERSE) {
  //     const hexedSignedPbst = this.psbtService.convertBase64ToHexed(
  //       body.signedPsbt,
  //     );
  //     signedPsbt = this.psbtService.finalizePsbtInput(hexedSignedPbst, [0]);
  //   }

  //   await this.swapOfferRepository.update(
  //     { psbt },
  //     {
  //       userSignedPsbt: signedPsbt,
  //       status: OfferStatus.ACCEPTED,
  //       isRead: true,
  //     },
  //   );

  //   try {
  //     const txId = await this.psbtService.combinePsbtAndPush(
  //       swapOffer.psbt,
  //       swapOffer.buyerSignedPsbt,
  //       signedPsbt,
  //     );
  //     await this.swapOfferRepository.update(
  //       {
  //         id: swapOffer.id,
  //       },
  //       { status: OfferStatus.PUSHED },
  //     );

  //     await this.buyNowActivityService.deleteBuyNowActivity(
  //       swapOffer.buyNowActivityId,
  //     );

  //     const buyNowActivities =
  //       await this.buyNowActivityService.getBuyNowActivityByInscriptionIds(
  //         swapOffer.swapInscription.map(
  //           (inscription) => inscription.inscriptionId,
  //         ),
  //       );

  //     if (buyNowActivities && buyNowActivities.length > 0)
  //       await this.buyNowActivityService.deleteBuyNowActivities(
  //         buyNowActivities.map((buyNowActivity) => buyNowActivity.id),
  //       );

  //     return txId;
  //   } catch (error) {
  //     await this.swapOfferRepository.update(
  //       {
  //         id: swapOffer.id,
  //       },
  //       { status: OfferStatus.FAILED },
  //     );

  //     throw new BadRequestException(
  //       'Transaction failed to push, buyer should create a psbt again',
  //     );
  //   }
  // }

  // async getActiveOffers(ownerAddress: string, pageOptionsDto: PageOptionsDto) {
  //   const user = await this.userService.findByAddress(ownerAddress);

  //   const swapOffers = await this.swapOfferRepository.find({
  //     select: {
  //       user: {
  //         name: true,
  //         address: true,
  //       },
  //     },
  //     where: {
  //       buyNowActivity: {
  //         userId: user.id,
  //       },
  //       status: OfferStatus.SIGNED,
  //     },
  //     relations: {
  //       buyNowActivity: { inscription: true, user: true },
  //       user: true,
  //       swapInscription: { inscription: true },
  //     },
  //     skip:
  //       pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
  //     take: pageOptionsDto.take,
  //     order: {
  //       id: pageOptionsDto.order,
  //     },
  //   });

  //   const entities = swapOffers.map((swapOffer) => {
  //     return {
  //       price: swapOffer.price,
  //       psbt: swapOffer.psbt,
  //       user: swapOffer.user,
  //       isRead: swapOffer.isRead,
  //       uuid: swapOffer.uuid,
  //       expiredAt: swapOffer.expiredAt,
  //       buyNowActivity: {
  //         inscription: {
  //           inscriptionId: swapOffer.buyNowActivity.inscription.inscriptionId,
  //         },
  //       },
  //       inscription: {
  //         inscriptionIds: swapOffer.swapInscription.map(
  //           (inscription) => inscription.inscription.inscriptionId,
  //         ),
  //       },
  //     };
  //   });

  //   if (user.walletType === WalletTypes.XVERSE)
  //     entities.forEach((offer) => {
  //       offer.psbt = this.psbtService.convertHexedToBase64(offer.psbt);
  //     });

  //   const itemCount = await this.swapOfferRepository
  //     .createQueryBuilder('swap_offer')
  //     .addFrom(BuyNowActivity, 'buy_now_activity')
  //     .where(`buy_now_activity.user_id=${user.id}`)
  //     .andWhere(`swap_offer.status='${OfferStatus.SIGNED}'`)
  //     .andWhere('swap_offer.buy_now_activity_id=buy_now_activity.id')
  //     .andWhere('buy_now_activity.deleted_at IS NULL')
  //     .getCount();

  //   const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

  //   return new PageDto(entities, pageMetaDto);
  // }

  // @Cron(CronExpression.EVERY_MINUTE)
  // async deleteExpiredOffers() {
  //   await this.swapOfferRepository.update(
  //     {
  //       expiredAt: LessThan(new Date()),
  //       status: Not(OfferStatus.PUSHED),
  //     },
  //     {
  //       status: OfferStatus.EXPIRED,
  //     },
  //   );

  //   await this.swapOfferRepository.softDelete({
  //     expiredAt: LessThan(new Date()),
  //     status: Not(OfferStatus.PUSHED),
  //   });
  // }

  // async getPendingOffers(userAddress: string, pageOptionsDto: PageOptionsDto) {
  //   const user = await this.userService.findByAddress(userAddress);

  //   const swapOffers = await this.swapOfferRepository.find({
  //     select: {
  //       user: {
  //         name: true,
  //         address: true,
  //       },
  //     },
  //     where: {
  //       userId: user.id,
  //       status: OfferStatus.SIGNED,
  //     },
  //     relations: {
  //       buyNowActivity: { inscription: true, user: true },
  //       user: true,
  //       swapInscription: { inscription: true },
  //     },
  //     skip:
  //       pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
  //     take: pageOptionsDto.take,
  //     order: {
  //       id: pageOptionsDto.order,
  //     },
  //   });

  //   const entities = swapOffers.map((swapOffer) => {
  //     return {
  //       price: swapOffer.price,
  //       psbt: swapOffer.psbt,
  //       uuid: swapOffer.uuid,
  //       expiredAt: swapOffer.expiredAt,
  //       buyNowActivity: {
  //         inscription: {
  //           inscriptionId: swapOffer.buyNowActivity.inscription.inscriptionId,
  //         },
  //         user: {
  //           name: swapOffer.buyNowActivity.user.name,
  //           address: swapOffer.buyNowActivity.user.address,
  //         },
  //       },
  //       inscription: {
  //         inscriptionIds: swapOffer.swapInscription.map(
  //           (inscription) => inscription.inscription.inscriptionId,
  //         ),
  //       },
  //     };
  //   });

  //   if (user.walletType === WalletTypes.XVERSE)
  //     entities.forEach((offer) => {
  //       offer.psbt = this.psbtService.convertHexedToBase64(offer.psbt);
  //     });

  //   const itemCount = await this.swapOfferRepository
  //     .createQueryBuilder('swap_offer')
  //     .addFrom(BuyNowActivity, 'buy_now_activity')
  //     .where(`swap_offer.user_id=${user.id}`)
  //     .andWhere(`swap_offer.status='${OfferStatus.SIGNED}'`)
  //     .andWhere('swap_offer.buy_now_activity_id=buy_now_activity.id')
  //     .andWhere('buy_now_activity.deleted_at IS NULL')
  //     .getCount();

  //   const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

  //   return new PageDto(entities, pageMetaDto);
  // }
}
