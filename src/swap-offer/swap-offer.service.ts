import { Cron, CronExpression } from '@nestjs/schedule';
import { And, Brackets, In, LessThan, Not } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, Injectable } from '@nestjs/common';
import { testnet, bitcoin, Network } from 'bitcoinjs-lib/src/networks';

import { WalletTypes } from '@src/user/user.entity';
import { InscriptionService } from '@src/inscription/inscription.service';
import { PsbtService } from '@src/psbt/psbt.service';
import { UserService } from '@src/user/user.service';
import { BuyerSignPsbtDto } from './dto/buyer-sign-psbt.dto';
import { SellerSignPsbtDto } from './dto/seller-sign-psbt.dto';
import { PageDto, PageMetaDto } from '@src/common/pagination/pagination.types';
import { SwapOfferRepository } from './swap-offer.repository';
import { OfferStatus, SwapOffer } from './swap-offer.entity';
import { BuyerSwapInscriptionRepository } from './buyer-swap-inscription.repository';
import { SellerSwapInscriptionRepository } from './seller-swap-inscription.repository';
import { Inscription } from '@src/inscription/inscription.entity';
import { BuyerSwapInscription } from './buyer-swap-inscription.entity';
import { SellerSwapInscription } from './seller-swap-inscription.entity';
import axios from 'axios';
import { GetOfferDto } from './dto/get-offer.dto';
import { GetUserHistoryDto } from './dto/get-user-history.dto';

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
        price: Math.floor(price * 10 ** 8),
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
      this.inscriptionService.findInscriptionAndSave(buyerInscriptionIds),
      this.inscriptionService.findInscriptionAndSave(sellerInscriptionIds),
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
      expiredAt.setDate(date + Number(time));
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
      relations: {
        buyer: true,
        seller: true,
      },
    });

    if (!swapOffer)
      throw new BadRequestException('Can not find the buy now offer');

    if (swapOffer.buyer.id !== user.id && swapOffer.seller.id !== user.id)
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
        { status: OfferStatus.PENDING, txId },
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

  async getUserSendingOffers(ownerAddress: string, getOfferDto: GetOfferDto) {
    const user = await this.userService.findByAddress(ownerAddress);

    const [swapOfferIds, itemCount] =
      await this.swapOfferRepository.findAndCount({
        select: {
          id: true,
          updatedAt: true,
        },
        where: [
          {
            buyer: { id: user.id },
            status: OfferStatus.SIGNED,
            buyerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            buyer: { id: user.id },
            status: OfferStatus.SIGNED,
            sellerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            buyer: { id: user.id },
            status: OfferStatus.SIGNED,
            seller: { address: getOfferDto.keyword },
          },
        ],
        relations: {
          buyerSwapInscription: { inscription: true },
          sellerSwapInscription: { inscription: true },
          buyer: true,
          seller: true,
        },
        skip: getOfferDto.skip ?? (getOfferDto.page - 1) * getOfferDto.take,
        take: getOfferDto.take,
        order: {
          updatedAt: 'DESC',
        },
      });

    const swapOffers = await this.swapOfferRepository.find({
      select: {
        buyer: {
          address: true,
        },
      },
      where: {
        id: In(swapOfferIds.map((inscription) => inscription.id)),
      },
      relations: {
        buyerSwapInscription: { inscription: true },
        sellerSwapInscription: { inscription: true },
        buyer: true,
        seller: true,
      },
    });

    const entities = swapOffers.map((swapOffer) => {
      return {
        price: swapOffer.price,
        psbt: swapOffer.psbt,
        buyer: swapOffer.buyer,
        seller: swapOffer.seller,
        uuid: swapOffer.uuid,
        expiredAt: swapOffer.expiredAt,
        status: swapOffer.status,
        buyerInscription: swapOffer.buyerSwapInscription.map((inscription) => {
          return {
            inscriptionId: inscription.inscription.inscriptionId,
          };
        }),
        sellerInscription: swapOffer.sellerSwapInscription.map(
          (inscription) => {
            return {
              inscriptionId: inscription.inscription.inscriptionId,
            };
          },
        ),
      };
    });

    if (user.walletType === WalletTypes.XVERSE)
      entities.forEach((offer) => {
        offer.psbt = this.psbtService.convertHexedToBase64(offer.psbt);
      });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: {
        skip: getOfferDto.skip,
        order: getOfferDto.order,
        page: getOfferDto.page,
        take: getOfferDto.take,
      },
    });

    return new PageDto(entities, pageMetaDto);
  }

  async getUserGettingOffers(ownerAddress: string, getOfferDto: GetOfferDto) {
    const user = await this.userService.findByAddress(ownerAddress);

    const [swapOfferIds, itemCount] =
      await this.swapOfferRepository.findAndCount({
        select: {
          id: true,
          updatedAt: true,
        },
        where: [
          {
            seller: { id: user.id },
            status: OfferStatus.SIGNED,
            buyerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            seller: { id: user.id },
            status: OfferStatus.SIGNED,
            sellerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            seller: { id: user.id },
            status: OfferStatus.SIGNED,
            buyer: { address: getOfferDto.keyword },
          },
        ],
        relations: {
          buyerSwapInscription: { inscription: true },
          sellerSwapInscription: { inscription: true },
          buyer: true,
          seller: true,
        },
        skip: getOfferDto.skip ?? (getOfferDto.page - 1) * getOfferDto.take,
        take: getOfferDto.take,
        order: {
          updatedAt: 'DESC',
        },
      });

    const swapOffers = await this.swapOfferRepository.find({
      select: {
        buyer: {
          address: true,
        },
      },
      where: {
        id: In(swapOfferIds.map((inscription) => inscription.id)),
      },
      relations: {
        buyerSwapInscription: { inscription: true },
        sellerSwapInscription: { inscription: true },
        buyer: true,
        seller: true,
      },
    });

    const entities = swapOffers.map((swapOffer) => {
      return {
        price: swapOffer.price,
        psbt: swapOffer.psbt,
        buyer: swapOffer.buyer,
        seller: swapOffer.seller,
        uuid: swapOffer.uuid,
        expiredAt: swapOffer.expiredAt,
        status: swapOffer.status,
        buyerInscription: swapOffer.buyerSwapInscription.map((inscription) => {
          return {
            inscriptionId: inscription.inscription.inscriptionId,
          };
        }),
        sellerInscription: swapOffer.sellerSwapInscription.map(
          (inscription) => {
            return {
              inscriptionId: inscription.inscription.inscriptionId,
            };
          },
        ),
      };
    });

    if (user.walletType === WalletTypes.XVERSE)
      entities.forEach((offer) => {
        offer.psbt = this.psbtService.convertHexedToBase64(offer.psbt);
      });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: {
        skip: getOfferDto.skip,
        order: getOfferDto.order,
        page: getOfferDto.page,
        take: getOfferDto.take,
      },
    });

    return new PageDto(entities, pageMetaDto);
  }

  async getSendingOffers(getOfferDto: GetOfferDto) {
    const [swapOfferIds, itemCount] =
      await this.swapOfferRepository.findAndCount({
        select: {
          id: true,
          updatedAt: true,
        },
        where: [
          {
            status: OfferStatus.SIGNED,
            buyerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            status: OfferStatus.SIGNED,
            sellerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            status: OfferStatus.SIGNED,
            buyer: { address: getOfferDto.keyword },
          },
          {
            status: OfferStatus.SIGNED,
            seller: { address: getOfferDto.keyword },
          },
        ],
        relations: {
          buyerSwapInscription: { inscription: true },
          sellerSwapInscription: { inscription: true },
          buyer: true,
          seller: true,
        },
        skip: getOfferDto.skip ?? (getOfferDto.page - 1) * getOfferDto.take,
        take: getOfferDto.take,
        order: {
          updatedAt: 'DESC',
        },
      });

    const swapOffers = await this.swapOfferRepository.find({
      select: {
        buyer: {
          address: true,
        },
      },
      where: {
        id: In(swapOfferIds.map((inscription) => inscription.id)),
      },
      relations: {
        buyerSwapInscription: { inscription: true },
        sellerSwapInscription: { inscription: true },
        buyer: true,
        seller: true,
      },
      skip: getOfferDto.skip ?? (getOfferDto.page - 1) * getOfferDto.take,
      take: getOfferDto.take,
      order: {
        updatedAt: 'DESC',
      },
    });

    const entities = swapOffers.map((swapOffer) => {
      return {
        price: swapOffer.price,
        psbt: swapOffer.psbt,
        buyer: swapOffer.buyer,
        seller: swapOffer.seller,
        uuid: swapOffer.uuid,
        expiredAt: swapOffer.expiredAt,
        status: swapOffer.status,
        buyerInscription: swapOffer.buyerSwapInscription.map((inscription) => {
          return {
            inscriptionId: inscription.inscription.inscriptionId,
          };
        }),
        sellerInscription: swapOffer.sellerSwapInscription.map(
          (inscription) => {
            return {
              inscriptionId: inscription.inscription.inscriptionId,
            };
          },
        ),
      };
    });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: {
        skip: getOfferDto.skip,
        order: getOfferDto.order,
        page: getOfferDto.page,
        take: getOfferDto.take,
      },
    });

    return new PageDto(entities, pageMetaDto);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async deleteExpiredOffers() {
    await this.swapOfferRepository.update(
      {
        expiredAt: LessThan(new Date()),
        status: In([
          OfferStatus.CREATED,
          OfferStatus.SIGNED,
          OfferStatus.ACCEPTED,
          OfferStatus.FAILED,
        ]),
      },
      {
        status: OfferStatus.EXPIRED,
      },
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkTx() {
    const pendingTxs = await this.swapOfferRepository.find({
      where: {
        status: OfferStatus.PENDING,
      },
    });

    await Promise.all(
      pendingTxs.map(async (tx) => {
        const isPushed = await this.checkTxIsPushed(tx.txId);

        await this.swapOfferRepository.update(
          {
            txId: tx.txId,
          },
          {
            status: OfferStatus.PUSHED,
          },
        );
        return isPushed;
      }),
    );
  }

  async checkTxIsPushed(txId: string): Promise<boolean> {
    const url =
      this.network === testnet
        ? `https://mempool.space/testnet/api/tx/${txId}`
        : `https://mempool.space/api/tx/${txId}`;

    const res = await axios.get(url);

    return res.data.status.confirmed;
  }

  async getUserPushedOffers(
    userAddress: string,
    getOfferDto: GetUserHistoryDto,
  ) {
    const user = await this.userService.findByAddress(userAddress);

    const status = getOfferDto.status
      ? [getOfferDto.status]
      : ['canceled', 'pending', 'pushed', 'expired', 'failed'];

    const [swapOfferIds, itemCount] =
      await this.swapOfferRepository.findAndCount({
        select: {
          id: true,
          updatedAt: true,
        },
        where: [
          {
            seller: {
              id: user.id,
            },
            status: In(status),
            buyerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            buyer: {
              id: user.id,
            },
            status: In(status),
            buyerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            seller: { id: user.id },
            status: In(status),
            sellerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            buyer: { id: user.id },
            status: In(status),
            sellerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            seller: {
              id: user.id,
            },
            status: In(status),
            buyer: { address: getOfferDto.keyword },
          },
          {
            buyer: {
              id: user.id,
            },
            status: In(status),
            seller: { address: getOfferDto.keyword },
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
        skip: getOfferDto.skip ?? (getOfferDto.page - 1) * getOfferDto.take,
        take: getOfferDto.take,
        order: {
          updatedAt: 'DESC',
        },
      });

    const swapOffers = await this.swapOfferRepository.find({
      select: {
        seller: {
          address: true,
        },
        buyer: {
          address: true,
        },
      },
      where: {
        id: In(swapOfferIds.map((inscription) => inscription.id)),
      },
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
    });

    const entities = swapOffers.map((swapOffer) => {
      return {
        uuid: swapOffer.uuid,
        price: swapOffer.price,
        status: swapOffer.status,
        pushedAt: swapOffer.updatedAt,
        buyerInscription: swapOffer.buyerSwapInscription.map((inscription) => {
          return {
            inscription: {
              inscriptionId: inscription.inscription.inscriptionId,
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
        sellerInscription: swapOffer.sellerSwapInscription.map(
          (inscription) => {
            return {
              inscription: {
                inscriptionId: inscription.inscription.inscriptionId,
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
          },
        ),
        buyer: swapOffer.buyer,
        seller: swapOffer.seller,
      };
    });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: {
        skip: getOfferDto.skip,
        order: getOfferDto.order,
        page: getOfferDto.page,
        take: getOfferDto.take,
      },
    });

    return new PageDto(entities, pageMetaDto);
  }

  async getPushedOffers(getOfferDto: GetOfferDto) {
    const [swapOfferIds, itemCount] =
      await this.swapOfferRepository.findAndCount({
        select: {
          id: true,
          updatedAt: true,
        },
        where: [
          {
            status: OfferStatus.PUSHED,
            buyerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            status: OfferStatus.PUSHED,
            sellerSwapInscription: {
              inscription: { inscriptionId: getOfferDto.keyword },
            },
          },
          {
            status: OfferStatus.PUSHED,
            buyer: { address: getOfferDto.keyword },
          },
          {
            status: OfferStatus.PUSHED,
            seller: { address: getOfferDto.keyword },
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
        skip: getOfferDto.skip ?? (getOfferDto.page - 1) * getOfferDto.take,
        take: getOfferDto.take,
        order: {
          updatedAt: 'DESC',
        },
      });

    const swapOffers = await this.swapOfferRepository.find({
      select: {
        seller: {
          address: true,
        },
        buyer: {
          address: true,
        },
      },
      where: {
        id: In(swapOfferIds.map((inscription) => inscription.id)),
      },
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
    });

    const entities = swapOffers.map((swapOffer) => {
      return {
        uuid: swapOffer.uuid,
        price: swapOffer.price,
        status: swapOffer.status,
        pushedAt: swapOffer.updatedAt,
        buyerInscription: swapOffer.buyerSwapInscription.map((inscription) => {
          return {
            inscription: {
              inscriptionId: inscription.inscription.inscriptionId,
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
        sellerInscription: swapOffer.sellerSwapInscription.map(
          (inscription) => {
            return {
              inscription: {
                inscriptionId: inscription.inscription.inscriptionId,
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
          },
        ),
        buyer: swapOffer.buyer,
        seller: swapOffer.seller,
      };
    });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: {
        skip: getOfferDto.skip,
        order: getOfferDto.order,
        page: getOfferDto.page,
        take: getOfferDto.take,
      },
    });

    return new PageDto(entities, pageMetaDto);
  }

  async getPushedOffersForSupportCollections() {
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
          status: OfferStatus.PUSHED,
          sellerSwapInscription: {
            inscription: {
              collectionId: And(LessThan(5), Not(1)),
            },
          },
        },
        {
          status: OfferStatus.PUSHED,
          buyerSwapInscription: {
            inscription: {
              collectionId: And(LessThan(5), Not(1)),
            },
          },
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
      take: 10,
      order: {
        updatedAt: 'DESC',
      },
    });

    const inscriptionIds: string[] = [];

    swapOffers.forEach((swapOffer) => {
      swapOffer.buyerSwapInscription.forEach((inscription) =>
        inscriptionIds.push(inscription.inscription.inscriptionId),
      );
      swapOffer.sellerSwapInscription.forEach((inscription) =>
        inscriptionIds.push(inscription.inscription.inscriptionId),
      );
    });

    const batchInscriptionInfo =
      await this.psbtService.getBatchInscriptionInfoBIS(inscriptionIds);

    const entities = swapOffers.map((swapOffer) => {
      return {
        uuid: swapOffer.uuid,
        price: swapOffer.price,
        status: swapOffer.status,
        pushedAt: swapOffer.updatedAt,
        buyerInscription: swapOffer.buyerSwapInscription.map((inscription) => {
          const inscriptionInfo =
            batchInscriptionInfo[inscription.inscription.inscriptionId];

          return {
            inscription: {
              ...inscriptionInfo,
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
        sellerInscription: swapOffer.sellerSwapInscription.map(
          (inscription) => {
            const inscriptionInfo =
              batchInscriptionInfo[inscription.inscription.inscriptionId];

            return {
              inscription: {
                ...inscriptionInfo,
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
          },
        ),
        buyer: swapOffer.buyer,
        seller: swapOffer.seller,
      };
    });

    return entities;
  }

  async getSwapOfferById(uuid: string): Promise<any> {
    const swapOffer = await this.swapOfferRepository.findOne({
      select: {
        seller: {
          address: true,
        },
        buyer: {
          address: true,
        },
      },
      where: { uuid },
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
    });

    if (!swapOffer) throw new BadRequestException('Can not find swap offer');

    return {
      uuid: swapOffer.uuid,
      psbt: swapOffer.psbt,
      buyer: swapOffer.buyer,
      seller: swapOffer.seller,
      expiredAt: swapOffer.expiredAt,
      price: swapOffer.price,
      status: swapOffer.status,
      buyerSwapInscription: await Promise.all(
        swapOffer.buyerSwapInscription.map(async (inscription) => {
          const inscriptionInfo = await this.psbtService.getInscriptionWithUtxo(
            inscription.inscription.inscriptionId,
          );

          return {
            inscription: {
              ...inscriptionInfo,
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
        }),
      ),
      sellerSwapInscription: await Promise.all(
        swapOffer.sellerSwapInscription.map(async (inscription) => {
          const inscriptionInfo = await this.psbtService.getInscriptionWithUtxo(
            inscription.inscription.inscriptionId,
          );

          return {
            inscription: {
              ...inscriptionInfo,
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
        }),
      ),
    };
  }
}
