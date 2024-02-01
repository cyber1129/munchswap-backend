import { Cron, CronExpression } from '@nestjs/schedule';
import { Brackets, LessThan, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, Injectable } from '@nestjs/common';
import { testnet, bitcoin, Network } from 'bitcoinjs-lib/src/networks';

import { WalletTypes } from '@src/user/user.entity';
import { InscriptionService } from '@src/inscription/inscription.service';
import { PsbtService } from '@src/psbt/psbt.service';
import { UserService } from '@src/user/user.service';
import { BuyerSignPsbtDto } from './dto/buyer-sign-psbt.dto';
import { SellerSignPsbtDto } from './dto/seller-sign-psbt.dto';
import {
  PageDto,
  PageMetaDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { SwapOfferRepository } from './swap-offer.repository';
import { OfferStatus, SwapOffer } from './swap-offer.entity';
import { BuyerSwapInscriptionRepository } from './buyer-swap-inscription.repository';
import { SellerSwapInscriptionRepository } from './seller-swap-inscription.repository';
import { Inscription } from '@src/inscription/inscription.entity';
import { BuyerSwapInscription } from './buyer-swap-inscription.entity';
import { SellerSwapInscription } from './seller-swap-inscription.entity';

@Injectable()
export class SwapOfferService {
  private network: Network;

  constructor(
    private swapOfferRepository: SwapOfferRepository,
    private buyerSwapInscriptionRepository: BuyerSwapInscriptionRepository,
    private sellerSwapInscriptionRepository: SellerSwapInscriptionRepository,
    private psbtService: PsbtService,
    private userService: UserService,
    private inscriptionService: InscriptionService,
    private configService: ConfigService,
  ) {
    const networkType = this.configService.get('psbtConfig.network');

    if (networkType === 'mainnet') this.network = bitcoin;
    else this.network = testnet;
  }

  async generatePsbt({
    address,
    buyerInscriptionIds,
    sellerInscriptionIds,
    walletType,
    price = 0,
    expiredIn,
  }: {
    address: string;
    buyerInscriptionIds: string[];
    sellerInscriptionIds: string[];
    walletType: WalletTypes;
    price?: number;
    expiredIn: string;
  }) {
    const { psbt, buyerAddress, sellerAddress } =
      await this.psbtService.generateSwapPsbt({
        walletType,
        sellerInscriptionIds,
        buyerInscriptionIds,
        price: price * 10 ** 8,
      });

    if (address !== buyerAddress)
      throw new BadRequestException('You are not owner of inscription');

    let [buyer, seller] = await Promise.all([
      this.userService.findByAddress(buyerAddress),
      this.userService.findByAddress(sellerAddress),
    ]);

    if (!buyer) buyer = await this.userService.createWithAddress(buyerAddress);
    if (!seller)
      seller = await this.userService.createWithAddress(sellerAddress);

    const [buyerInscriptions, sellerInscriptions] = await Promise.all([
      this.inscriptionService.findInscriptionByIds(buyerInscriptionIds),
      this.inscriptionService.findInscriptionByIds(sellerInscriptionIds),
    ]);

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

    const swapOffer = this.swapOfferRepository.create({
      price,
      status: OfferStatus.CREATED,
      psbt,
      buyer,
      seller,
      expiredAt,
    });

    const savedSwapOffer = await this.swapOfferRepository.save(swapOffer);

    await Promise.all(
      buyerInscriptions.map((inscription) =>
        this.saveBuyerSwapInscription(inscription, savedSwapOffer),
      ),
    );
    await Promise.all(
      sellerInscriptions.map((inscription) =>
        this.saveSellerSwapInscription(inscription, savedSwapOffer),
      ),
    );

    return { psbt };
  }

  async saveBuyerSwapInscription(
    inscription: Inscription,
    swapOffer: SwapOffer,
  ): Promise<Partial<BuyerSwapInscription>> {
    const swapInscriptionEntity: Partial<BuyerSwapInscription> = {
      inscription,
      swapOffer,
    };
    const swapInscription = await this.buyerSwapInscriptionRepository.save(
      swapInscriptionEntity,
      { reload: false },
    );

    return swapInscription;
  }

  async saveSellerSwapInscription(
    inscription: Inscription,
    swapOffer: SwapOffer,
  ): Promise<Partial<SellerSwapInscription>> {
    const swapInscriptionEntity: Partial<SellerSwapInscription> = {
      inscription,
      swapOffer,
    };
    const swapInscription = await this.sellerSwapInscriptionRepository.save(
      swapInscriptionEntity,
      { reload: false },
    );

    return swapInscription;
  }

  async cancelSwapOffer(uuid: string, address: string): Promise<boolean> {
    const user = await this.userService.findByAddress(address);

    const swapOffer = await this.swapOfferRepository.findOne({
      where: {
        uuid,
      },
    });

    if (!swapOffer)
      throw new BadRequestException('Can not find the buy now offer');

    if (swapOffer.buyer.id !== user.id)
      throw new BadRequestException('You can not cancel the offer');

    if (swapOffer.seller.id !== user.id)
      throw new BadRequestException('You can not cancel the offer');

    await this.swapOfferRepository.update(
      {
        uuid,
      },
      { status: OfferStatus.CANCELED },
    );

    return true;
  }

  async buyerSignPsbt(
    body: BuyerSignPsbtDto,
    userAddress: string,
  ): Promise<string> {
    const user = await this.userService.findByAddress(userAddress);

    const swapOffer = await this.swapOfferRepository.findOne({
      where: { psbt: body.psbt, buyer: { id: user.id } },
    });

    if (!swapOffer)
      throw new BadRequestException('Can not find that swap offer');

    const signedPsbt = body.signedPsbt;

    await this.swapOfferRepository.update(
      { psbt: body.psbt },
      {
        buyerSignedPsbt: signedPsbt,
        status: OfferStatus.SIGNED,
      },
    );

    return swapOffer.uuid;
  }

  async sellerSignPsbt(
    body: SellerSignPsbtDto,
    userAddress: string,
  ): Promise<string> {
    const seller = await this.userService.findByAddress(userAddress);

    const swapOffer = await this.swapOfferRepository.findOne({
      where: {
        psbt: body.psbt,
        seller: { id: seller.id },
      },
    });

    if (!swapOffer)
      throw new BadRequestException('Can not find that swap now offer');

    const signedPsbt = body.signedPsbt;

    await this.swapOfferRepository.update(
      { psbt: body.psbt },
      {
        sellerSignedPsbt: signedPsbt,
        status: OfferStatus.ACCEPTED,
      },
    );

    try {
      const txId = await this.psbtService.combinePsbtAndPush(
        swapOffer.psbt,
        swapOffer.buyerSignedPsbt,
        signedPsbt,
      );
      await this.swapOfferRepository.update(
        {
          id: swapOffer.id,
        },
        { status: OfferStatus.PUSHED },
      );

      return txId;
    } catch (error) {
      await this.swapOfferRepository.update(
        {
          id: swapOffer.id,
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

    const swapOffers = await this.swapOfferRepository.find({
      select: {
        buyer: {
          address: true,
        },
      },
      where: {
        buyer: { id: user.id },
        status: OfferStatus.SIGNED,
      },
      relations: {
        buyerSwapInscription: { inscription: { collection: true } },
        sellerSwapInscription: { inscription: { collection: true } },
        buyer: true,
        seller: true,
      },
      skip:
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      take: pageOptionsDto.take,
      order: {
        id: pageOptionsDto.order,
      },
    });

    const entities = swapOffers.map((swapOffer) => {
      return {
        price: swapOffer.price,
        psbt: swapOffer.psbt,
        buyer: swapOffer.buyer.address,
        seller: swapOffer.seller.address,
        uuid: swapOffer.uuid,
        expiredAt: swapOffer.expiredAt,
        buyerInscription: swapOffer.buyerSwapInscription.map((inscription) => {
          return {
            inscriptionId: inscription.inscription.inscriptionId,
            collection: {
              imgUrl: inscription.inscription.collection.imgUrl,
              description: inscription.inscription.collection.description,
              name: inscription.inscription.collection.name,
              discord: inscription.inscription.collection.discord,
              website: inscription.inscription.collection.website,
              twitter: inscription.inscription.collection.twitter,
            },
          };
        }),
        sellerInscription: swapOffer.sellerSwapInscription.map(
          (inscription) => {
            return {
              inscriptionId: inscription.inscription.inscriptionId,
              collection: {
                imgUrl: inscription.inscription.collection.imgUrl,
                description: inscription.inscription.collection.description,
                name: inscription.inscription.collection.name,
                discord: inscription.inscription.collection.discord,
                website: inscription.inscription.collection.website,
                twitter: inscription.inscription.collection.twitter,
              },
            };
          },
        ),
      };
    });

    if (user.walletType === WalletTypes.XVERSE)
      entities.forEach((offer) => {
        offer.psbt = this.psbtService.convertHexedToBase64(offer.psbt);
      });

    const itemCount = await this.swapOfferRepository
      .createQueryBuilder('swap_offer')
      .where(`buyer_id=${user.id}`)
      .andWhere(`swap_offer.status='${OfferStatus.SIGNED}'`)
      .getCount();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(entities, pageMetaDto);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async deleteExpiredOffers() {
    await this.swapOfferRepository.update(
      {
        expiredAt: LessThan(new Date()),
        status: Not(OfferStatus.PUSHED),
      },
      {
        status: OfferStatus.EXPIRED,
      },
    );

    await this.swapOfferRepository.softDelete({
      expiredAt: LessThan(new Date()),
      status: Not(OfferStatus.PUSHED),
    });
  }

  async getPushedOffers(userAddress: string, pageOptionsDto: PageOptionsDto) {
    const user = await this.userService.findByAddress(userAddress);

    const swapOffers = await this.swapOfferRepository.find({
      select: {
        seller: {
          address: true,
        },
        buyer: {
          address: true,
        },
      },
      where: [
        {
          seller: {
            id: user.id,
          },
          status: OfferStatus.PUSHED,
        },
        {
          buyer: {
            id: user.id,
          },
          status: OfferStatus.PUSHED,
        },
      ],
      relations: {
        buyerSwapInscription: {
          inscription: { collection: true },
        },
        sellerSwapInscription: {
          inscription: { collection: true },
        },
        seller: true,
        buyer: true,
      },
      skip:
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      take: pageOptionsDto.take,
      order: {
        id: pageOptionsDto.order,
      },
    });

    const entities = swapOffers.map((swapOffer) => {
      return {
        price: swapOffer.price,
        expiredAt: swapOffer.expiredAt,
        buyerInscripion: swapOffer.buyerSwapInscription.map((inscription) => {
          return {
            inscription: {
              inscriptionId: inscription.inscriptionId,
              collection: {
                name: inscription.inscription.collection.name,
                imgUrl: inscription.inscription.collection.imgUrl,
                description: inscription.inscription.collection.description,
                discord: inscription.inscription.collection.discord,
                website: inscription.inscription.collection.website,
                twitter: inscription.inscription.collection.twitter,
              },
            },
          };
        }),
        sellerInscripion: swapOffer.sellerSwapInscription.map((inscription) => {
          return {
            inscription: {
              inscriptionId: inscription.inscriptionId,
              collection: {
                name: inscription.inscription.collection.name,
                imgUrl: inscription.inscription.collection.imgUrl,
                description: inscription.inscription.collection.description,
                discord: inscription.inscription.collection.discord,
                website: inscription.inscription.collection.website,
                twitter: inscription.inscription.collection.twitter,
              },
            },
          };
        }),
        buyer: swapOffer.buyer,
        seller: swapOffer.seller,
      };
    });

    const itemCount = await this.swapOfferRepository
      .createQueryBuilder('swap_offer')
      .andWhere(
        new Brackets((subQuery) =>
          subQuery
            .where(`swap_offer.buyer_id=${user.id}`)
            .orWhere(`swap_offer.seller_id=${user.id}`),
        ),
      )
      .andWhere(`swap_offer.status='${OfferStatus.PUSHED}'`)
      .getCount();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(entities, pageMetaDto);
  }

  async getSwapOfferById(uuid: string): Promise<any> {
    const swapOffer = await this.swapOfferRepository.findOne({
      where: {
        uuid,
      },
      select: {
        buyer: {
          address: true,
        },
        seller: {
          address: true,
        },
        buyerSwapInscription: true,
        sellerSwapInscription: true,
      },
      relations: {
        buyer: true,
        seller: true,
        buyerSwapInscription: { inscription: { collection: true } },
        sellerSwapInscription: { inscription: { collection: true } },
      },
    });

    return {
      uuid: swapOffer.uuid,
      psbt: swapOffer.psbt,
      buyer: swapOffer.buyer,
      seller: swapOffer.seller,
      expiredAt: swapOffer.expiredAt,
      buyerSwapInscription: swapOffer.buyerSwapInscription.map(
        (inscription) => {
          return {
            inscription: {
              inscriptionId: inscription.id,
              collection: {
                name: inscription.inscription.collection.name,
                imgUrl: inscription.inscription.collection.imgUrl,
                description: inscription.inscription.collection.description,
                website: inscription.inscription.collection.website,
                discord: inscription.inscription.collection.discord,
                twitter: inscription.inscription.collection.twitter,
              },
            },
          };
        },
      ),
      sellerSwapInscription: swapOffer.sellerSwapInscription.map(
        (inscription) => {
          return {
            inscription: {
              inscriptionId: inscription.id,
              collection: {
                name: inscription.inscription.collection.name,
                imgUrl: inscription.inscription.collection.imgUrl,
                description: inscription.inscription.collection.description,
                website: inscription.inscription.collection.website,
                discord: inscription.inscription.collection.discord,
                twitter: inscription.inscription.collection.twitter,
              },
            },
          };
        },
      ),
    };
  }
}
