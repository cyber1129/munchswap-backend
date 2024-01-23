import { BadRequestException, Injectable } from '@nestjs/common';
import { testnet, bitcoin, Network } from 'bitcoinjs-lib/src/networks';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Not } from 'typeorm';

import {
  PageDto,
  PageMetaDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { PsbtService } from '@src/psbt/psbt.service';
import { WalletTypes } from '@src/user/user.entity';
import { BuyNowActivityService } from '@src/buy-now-activity/buy-now-activity.service';
import { InscriptionService } from '@src/inscription/inscription.service';
import { UserService } from '@src/user/user.service';
import { BuyNowActivity } from '@src/buy-now-activity/buy-now-activity.entity';
import { BuyNowOfferRepository } from './buy-now-offer.repository';
import { BuyNowOffer, OfferStatus } from './buy-now-offer.entity';
import { BuyerSignPsbtDto } from './dto/buyer-sign-psbt.dto';
import { OwnerSignPsbtDto } from './dto/owner-sign-psbt.dto';

@Injectable()
export class BuyNowOfferService {
  private network: Network;

  constructor(
    private psbtService: PsbtService,
    private buyNowOfferRepository: BuyNowOfferRepository,
    private buyNowActivityService: BuyNowActivityService,
    private userService: UserService,
    private inscriptionService: InscriptionService,
    private configService: ConfigService,
  ) {
    const networkType = this.configService.get('psbtConfig.network');

    if (networkType === 'mainnet') this.network = bitcoin;
    else this.network = testnet;
  }

  async generatePsbt({
    inscriptionId,
    recipient,
    buyerPubkey,
    walletType,
    expiredIn,
  }: {
    inscriptionId: string;
    recipient: string;
    buyerPubkey: string;
    walletType: WalletTypes;
    expiredIn: string;
  }): Promise<{ psbt: string; inputCount: number }> {
    const isOwner = await this.inscriptionService.checkInscriptionOwner(
      recipient,
      inscriptionId,
    );

    if (isOwner)
      throw new BadRequestException('You are owner of the inscription');

    const txData = await this.buyNowActivityService.getBuyNowPsbtDatas({
      inscriptionId,
    });

    const { psbt, inputCount } = await this.psbtService.generateBuyNowPsbt({
      ownerPubkey: txData.pubkey,
      buyerPubkey,
      walletType,
      recipient,
      network: this.network,
      inscriptionId,
      price: txData.price * 10 ** 8,
      ownerWalletType: txData.walletType,
      ownerPaymentAddress: txData.paymentAddress,
    });

    const user = await this.userService.findByAddress(recipient);

    const buyNowOffer = await this.buyNowOfferRepository.findOne({
      where: {
        userId: user.id,
        buyNowActivityId: txData.buyNowActivityId,
      },
    });

    const expiredAt = new Date();
    const time = expiredIn.match(/\d+/)[0];

    if (expiredIn.endsWith('m')) {
      const minutes = expiredAt.getMinutes();
      expiredAt.setMinutes(minutes + Number(time));
    } else if (expiredIn.endsWith('h')) {
      const hours = expiredAt.getHours();
      expiredAt.setHours(hours + Number(time));
    } else if (expiredIn.endsWith('d')) {
      const date = expiredAt.getDate();
      expiredAt.setHours(date + Number(time));
    }

    if (buyNowOffer) {
      await this.buyNowOfferRepository.update(
        {
          userId: user.id,
          buyNowActivityId: txData.buyNowActivityId,
        },
        {
          price: txData.price,
          status: OfferStatus.CREATED,
          psbt,
          expiredAt,
        },
      );
    } else {
      const buyNowOffer = this.buyNowOfferRepository.create({
        buyNowActivityId: txData.buyNowActivityId,
        price: txData.price,
        status: OfferStatus.CREATED,
        psbt,
        user,
        expiredAt,
      });

      await this.buyNowOfferRepository.save(buyNowOffer);
    }

    if (walletType === WalletTypes.XVERSE) {
      const base64Psbt = this.psbtService.convertHexedToBase64(psbt);

      return { psbt: base64Psbt, inputCount };
    }

    return { psbt, inputCount };
  }

  async buyerSignPsbt(body: BuyerSignPsbtDto, userAddress: string) {
    const user = await this.userService.findByAddress(userAddress);

    let psbt = body.psbt;
    if (body.walletType === WalletTypes.XVERSE)
      psbt = this.psbtService.convertBase64ToHexed(body.psbt);

    const buyNowOffer = await this.buyNowOfferRepository.findOne({
      where: { psbt, userId: user.id },
    });

    if (!buyNowOffer)
      throw new BadRequestException('Can not find that buy now offer');

    let signedPsbt = body.signedPsbt;

    const inputCount = this.psbtService.getInputCount(psbt);
    const inputsToFinalize: number[] = [];

    for (let i = 1; i < inputCount; i++) {
      inputsToFinalize.push(i);
    }

    if (body.walletType === WalletTypes.HIRO) {
      signedPsbt = this.psbtService.finalizePsbtInput(
        body.signedPsbt,
        inputsToFinalize,
      );
    } else if (body.walletType === WalletTypes.XVERSE) {
      const signedHexedPsbt = this.psbtService.convertBase64ToHexed(
        body.signedPsbt,
      );
      signedPsbt = this.psbtService.finalizePsbtInput(
        signedHexedPsbt,
        inputsToFinalize,
      );
    }

    await this.buyNowOfferRepository.update(
      { psbt },
      {
        buyerSignedPsbt: signedPsbt,
        status: OfferStatus.SIGNED,
        isRead: false,
      },
    );

    return true;
  }

  async ownerSignPsbt(
    body: OwnerSignPsbtDto,
    userAddress: string,
  ): Promise<string> {
    const user = await this.userService.findByAddress(userAddress);
    let psbt = body.psbt;

    if (body.walletType === WalletTypes.XVERSE) {
      psbt = this.psbtService.convertBase64ToHexed(body.psbt);
    }

    const buyNowOffer = await this.buyNowOfferRepository.findOne({
      where: {
        psbt,
        buyNowActivity: { userId: user.id },
        deletedAt: null,
      },
    });

    if (!buyNowOffer)
      throw new BadRequestException('Can not find that buy now offer');

    let signedPsbt = body.signedPsbt;

    if (user.walletType === WalletTypes.HIRO) {
      signedPsbt = this.psbtService.finalizePsbtInput(body.signedPsbt, [0]);
    } else if (body.walletType === WalletTypes.XVERSE) {
      const hexedSignedPbst = this.psbtService.convertBase64ToHexed(
        body.signedPsbt,
      );
      signedPsbt = this.psbtService.finalizePsbtInput(hexedSignedPbst, [0]);
    }

    await this.buyNowOfferRepository.update(
      { psbt },
      {
        userSignedPsbt: signedPsbt,
        status: OfferStatus.ACCEPTED,
        isRead: true,
      },
    );

    try {
      const txId = await this.psbtService.combinePsbtAndPush(
        buyNowOffer.psbt,
        buyNowOffer.buyerSignedPsbt,
        signedPsbt,
      );

      await this.buyNowOfferRepository.update(
        {
          id: buyNowOffer.id,
        },
        { status: OfferStatus.PUSHED },
      );

      await this.buyNowActivityService.deleteBuyNowActivity(
        buyNowOffer.buyNowActivityId,
      );

      return txId;
    } catch (error) {
      await this.buyNowOfferRepository.update(
        {
          id: buyNowOffer.id,
        },
        { status: OfferStatus.FAILED },
      );

      throw new BadRequestException(
        'Transaction failed to push, buyer should create a psbt again',
      );
    }
  }

  async getActiveOffers(ownerAddress: string, pageOptionsDto: PageOptionsDto) {
    const user = await this.userService.findByAddress(ownerAddress);

    const buyNowOffers = await this.buyNowOfferRepository.find({
      select: {
        user: {
          name: true,
          address: true,
        },
      },
      where: {
        buyNowActivity: {
          userId: user.id,
        },
        status: OfferStatus.SIGNED,
      },
      relations: {
        buyNowActivity: { inscription: true, user: true },
        user: true,
      },
      skip:
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      take: pageOptionsDto.take,
      order: {
        id: pageOptionsDto.order,
      },
    });

    const entities = buyNowOffers.map((buyNowOffer) => {
      return {
        price: buyNowOffer.price,
        psbt: buyNowOffer.psbt,
        user: buyNowOffer.user,
        isRead: buyNowOffer.isRead,
        uuid: buyNowOffer.uuid,
        expiredAt: buyNowOffer.expiredAt,
        buyNowActivity: {
          inscription: {
            inscriptionId: buyNowOffer.buyNowActivity.inscription.inscriptionId,
          },
        },
      };
    });

    const itemCount = await this.buyNowOfferRepository
      .createQueryBuilder('buy_now_offer')
      .addFrom(BuyNowActivity, 'buy_now_activity')
      .where(`buy_now_activity.user_id=${user.id}`)
      .andWhere(`buy_now_offer.status='${OfferStatus.SIGNED}'`)
      .andWhere('buy_now_offer.buy_now_activity_id=buy_now_activity.id')
      .andWhere('buy_now_activity.deleted_at IS NULL')
      .getCount();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    if (user.walletType === WalletTypes.XVERSE)
      entities.forEach((offer) => {
        offer.psbt = this.psbtService.convertHexedToBase64(offer.psbt);
      });

    return new PageDto(entities, pageMetaDto);
  }

  async setAsRead(buyNowOfferUuid: string) {
    const res = this.buyNowOfferRepository.update(
      {
        uuid: buyNowOfferUuid,
      },
      { isRead: true },
    );

    return true;
  }

  async cancelBuyNowOffer(uuid: string, address: string): Promise<boolean> {
    const user = await this.userService.findByAddress(address);
    const buyNowOffer = await this.buyNowOfferRepository.findOne({
      where: {
        uuid,
      },
      relations: { buyNowActivity: true },
    });

    if (!buyNowOffer)
      throw new BadRequestException('Can not find the buy now offer');
    if (
      buyNowOffer.buyNowActivity.userId !== user.id &&
      buyNowOffer.userId !== user.id
    )
      throw new BadRequestException('You can not cancel the offer');

    await this.buyNowOfferRepository.update(
      {
        uuid,
      },
      { status: OfferStatus.CANCELED },
    );

    return true;
  }

  async getRecentSales() {
    const buyNowOffers = await this.buyNowOfferRepository.find({
      relations: {
        buyNowActivity: {
          inscription: { collection: true },
        },
        user: true,
      },
      select: {
        user: { name: true, address: true },
      },
      where: { status: OfferStatus.PUSHED },
      order: { updatedAt: 'DESC' },
      withDeleted: true,
      take: 3,
    });

    return buyNowOffers.map((buyNowOffer) => {
      return {
        user: {
          address: buyNowOffer.user.address,
          name: buyNowOffer.user.name,
        },
        price: buyNowOffer.price,
        time: buyNowOffer.updatedAt,
        collection: {
          imgUrl: buyNowOffer.buyNowActivity.inscription.collection.imgUrl,
          description:
            buyNowOffer.buyNowActivity.inscription.collection.description,
          name: buyNowOffer.buyNowActivity.inscription.collection.name,
        },
        inscriptionId: buyNowOffer.buyNowActivity.inscription.inscriptionId,
      };
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async deleteExpiredOffers() {
    await this.buyNowOfferRepository.update(
      {
        expiredAt: LessThan(new Date()),
        status: Not(OfferStatus.PUSHED),
      },
      {
        status: OfferStatus.EXPIRED,
      },
    );

    await this.buyNowOfferRepository.softDelete({
      status: Not(OfferStatus.PUSHED),
      expiredAt: LessThan(new Date()),
    });
  }

  async getPendingOffers(userAddress: string, pageOptionsDto: PageOptionsDto) {
    const user = await this.userService.findByAddress(userAddress);

    const buyNowOffers = await this.buyNowOfferRepository.find({
      select: {
        user: {
          name: true,
          address: true,
        },
      },
      where: {
        userId: user.id,
        status: OfferStatus.SIGNED,
      },
      relations: {
        buyNowActivity: { inscription: true, user: true },
        user: true,
      },
      skip:
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      take: pageOptionsDto.take,
      order: {
        id: pageOptionsDto.order,
      },
    });

    const entities = buyNowOffers.map((buyNowOffer) => {
      return {
        price: buyNowOffer.price,
        psbt: buyNowOffer.psbt,
        user: buyNowOffer.user,
        isRead: buyNowOffer.isRead,
        uuid: buyNowOffer.uuid,
        expiredAt: buyNowOffer.expiredAt,
        buyNowActivity: {
          inscription: {
            inscriptionId: buyNowOffer.buyNowActivity.inscription.inscriptionId,
          },
          user: {
            name: buyNowOffer.buyNowActivity.user.name,
            address: buyNowOffer.buyNowActivity.user.address,
          }
        },
      };
    });

    const itemCount = await this.buyNowOfferRepository
      .createQueryBuilder('buy_now_offer')
      .addFrom(BuyNowActivity, 'buy_now_activity')
      .where(`buy_now_offer.user_id=${user.id}`)
      .andWhere(`buy_now_offer.status='${OfferStatus.SIGNED}'`)
      .andWhere('buy_now_offer.buy_now_activity_id=buy_now_activity.id')
      .andWhere('buy_now_activity.deleted_at IS NULL')
      .getCount();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    if (user.walletType === WalletTypes.XVERSE)
      entities.forEach((offer) => {
        offer.psbt = this.psbtService.convertHexedToBase64(offer.psbt);
      });

    return new PageDto(entities, pageMetaDto);
  }
}
