import { BadRequestException, Injectable } from '@nestjs/common';
import { In, Like } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { PageDto, PageMetaDto } from '@src/common/pagination/pagination.types';
import { UserService } from '@src/user/user.service';
import { InscriptionService } from '@src/inscription/inscription.service';
import { Inscription } from '@src/inscription/inscription.entity';
import { User, WalletTypes } from '@src/user/user.entity';
import { BuyNowActivityRepository } from './buy-now-activity.repository';
import { CreateBuyNowActivityDto } from './dto/create-buy-now-activity.dto';
import { ActivityStatus, BuyNowActivity } from './buy-now-activity.entity';
import { GetPaginatedInscriptionFilterDto } from './dto/get-paginated-inscription-filter.dto';

@Injectable()
export class BuyNowActivityService {
  private feePercent: number;

  constructor(
    private buyNowActivityRepository: BuyNowActivityRepository,
    private userService: UserService,
    private inscriptionService: InscriptionService,
    private configService: ConfigService,
  ) {
    this.feePercent = this.configService.get('psbtConfig.feePercent');
  }
  async findByUuid(uuid: string): Promise<BuyNowActivity> {
    return this.buyNowActivityRepository.findOne({ where: { uuid } });
  }

  async createBuyNowActivity(
    body: CreateBuyNowActivityDto,
    userUuid: string,
  ): Promise<BuyNowActivity> {
    const user = await this.userService.findByUuid(userUuid);
    const isOwner = await this.inscriptionService.checkInscriptionOwner(
      user.address,
      body.inscriptionId,
    );
    if (!isOwner)
      throw new BadRequestException('You are not owner of the inscription');

    const inscription = await this.inscriptionService.findInscriptionById(
      body.inscriptionId,
    );
    if (!inscription)
      throw new BadRequestException(
        'Can not find a collection that contains that inscription',
      );

    const buyNowActivity = await this.buyNowActivityRepository.findOne({
      where: {
        inscriptionId: inscription.id,
      },
    });
    if (buyNowActivity) {
      await this.buyNowActivityRepository.softDelete({
        inscriptionId: inscription.id,
      });
    }

    const buyNowActivityEntity: Partial<BuyNowActivity> = {
      inscriptionId: inscription.id,
      price: body.price,
      user,
    };
    const SavedBuyNowActivity = await this.buyNowActivityRepository.save(
      buyNowActivityEntity,
    );

    return this.buyNowActivityRepository.findOne({
      where: { uuid: SavedBuyNowActivity.uuid },
      relations: { inscription: true },
    });
  }

  async removeBuyNowActivity(
    userAddress: string,
    inscriptionId: string,
  ): Promise<{ res: string }> {
    const user = await this.userService.findByAddress(userAddress);
    const isOwner = await this.inscriptionService.checkInscriptionOwner(
      user.address,
      inscriptionId,
    );
    if (!isOwner)
      throw new BadRequestException('You are not owner of the inscription');

    const buyNowActivity = await this.buyNowActivityRepository.findOne({
      where: { userId: user.id, inscription: { inscriptionId } },
    });
    if (!buyNowActivity)
      throw new BadRequestException('Can not find the activity');

    await this.buyNowActivityRepository.softDelete({
      id: buyNowActivity.id,
    });

    return { res: 'Success' };
  }

  async getBuyNowActivity(inscriptionId: string): Promise<BuyNowActivity> {
    const inscription = await this.inscriptionService.findInscriptionById(
      inscriptionId,
    );
    if (!inscription)
      throw new BadRequestException(
        'Can not find a collection that include this inscription',
      );

    return this.buyNowActivityRepository.findOne({
      where: { inscriptionId: inscription.id },
    });
  }

  async getBuyNowActivityByInscriptionId(
    inscriptionId: number,
  ): Promise<BuyNowActivity> {
    return this.buyNowActivityRepository.findOne({
      where: { inscriptionId },
    });
  }

  async getBuyNowActivityByInscriptionIds(
    inscriptionIds: number[],
  ): Promise<BuyNowActivity[]> {
    return this.buyNowActivityRepository.find({
      where: { inscription: In(inscriptionIds) },
    });
  }

  async getDiscoverBuyNowActivityDatas(
    pageOptionsDto: GetPaginatedInscriptionFilterDto,
  ): Promise<PageDto<BuyNowActivity>> {
    const now = new Date();
    const date = now.getDate();
    now.setDate(date - pageOptionsDto.time);

    const queryBuilder = await this.buyNowActivityRepository
      .createQueryBuilder('buy_now_activity')
      .leftJoinAndSelect('buy_now_activity.inscription', 'inscription')
      .leftJoinAndSelect('buy_now_activity.user', 'user')
      .leftJoinAndSelect('inscription.collection', 'collection')
      .andWhere('buy_now_activity.updated_at > :date', { date: now });

    if (pageOptionsDto.minPrice) {
      queryBuilder.where(`buy_now_activity.price>=${pageOptionsDto.minPrice}`);
    }

    if (pageOptionsDto.maxPrice) {
      queryBuilder.andWhere(
        `buy_now_activity.price<=${pageOptionsDto.maxPrice}`,
      );
    }

    if (pageOptionsDto.search) {
      queryBuilder.andWhere('inscription.inscription_id like :search', {
        search: `%${pageOptionsDto.search}%`,
      });
    }

    if (pageOptionsDto.orderBy) {
      if (pageOptionsDto.orderBy === 'time') {
        queryBuilder.orderBy('buy_now_activity.id', pageOptionsDto.order);
      } else if (pageOptionsDto.orderBy === 'price') {
        queryBuilder.orderBy('buy_now_activity.price', pageOptionsDto.order);
      } else if (pageOptionsDto.orderBy === 'collection') {
        queryBuilder.orderBy('collection.name', pageOptionsDto.order);
      } else if (pageOptionsDto.orderBy === 'user') {
        queryBuilder.orderBy('user.name', pageOptionsDto.order);
      }
    }

    queryBuilder
      .skip(
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      )
      .take(pageOptionsDto.take);

    const itemCount = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });

    return new PageDto(entities, pageMetaDto);
  }

  async getDiscoverBuyNowActivityByInscriptionId(inscriptionId: string) {
    const buyNowActivityInfo = await this.buyNowActivityRepository.findOne({
      where: {
        inscription: { inscriptionId: inscriptionId },
      },
      relations: {
        user: true,
        inscription: { collection: true },
      },
      select: {
        user: { name: true, address: true },
        inscription: {
          collection: { name: true, description: true, imgUrl: true },
          inscriptionId: true,
        },
      },
    });

    if (!buyNowActivityInfo)
      throw new BadRequestException('Can not find Buy Now Activity');

    {
      delete buyNowActivityInfo.id;
      delete buyNowActivityInfo.status;
      delete buyNowActivityInfo.inscriptionId;
      delete buyNowActivityInfo.userId;
      delete buyNowActivityInfo.createdAt;
      delete buyNowActivityInfo.updatedAt;
      delete buyNowActivityInfo.deletedAt;
    }

    const isOwner = await this.inscriptionService.checkInscriptionOwner(
      buyNowActivityInfo.user.address,
      buyNowActivityInfo.inscription.inscriptionId,
    );
    if (!isOwner) {
      await this.buyNowActivityRepository.softDelete({
        uuid: buyNowActivityInfo.uuid,
      });
      throw new BadRequestException(
        'That user is not owner of the inscription',
      );
    }

    return buyNowActivityInfo;
  }

  async getBuyNowPsbtDatas({
    inscriptionId,
  }: {
    inscriptionId: string;
  }): Promise<{
    pubkey: string;
    inscriptionId: string;
    price: number;
    buyNowActivityId: number;
    walletType: WalletTypes;
    paymentAddress: string;
  }> {
    const txData = await this.buyNowActivityRepository
      .createQueryBuilder('buy_now_activity')
      .select([
        'user.pubkey as pubkey',
        'inscription.inscription_id as inscription_id',
        'buy_now_activity.price as price',
        'buy_now_activity.id as buy_now_activity_id',
        'user.wallet_type as wallet_type',
        'user.payment_address as payment_address',
      ])
      .from(User, 'user')
      .addFrom(Inscription, 'inscription')
      .where(`inscription.inscription_id='${inscriptionId}'`)
      .andWhere(`inscription.id=buy_now_activity.inscription_id`)
      .andWhere(`buy_now_activity.user_id=user.id`)
      .andWhere('buy_now_activity.deleted_at is null')
      .getRawOne();

    if (!txData)
      throw new BadRequestException(
        'Can not find price and inscription data in Database',
      );

    return {
      pubkey: txData.pubkey,
      inscriptionId: txData.inscription_id,
      price: txData.price,
      buyNowActivityId: txData.buy_now_activity_id,
      walletType: txData.wallet_type,
      paymentAddress: txData.payment_address,
    };
  }

  async deleteBuyNowActivity(id: number) {
    await this.buyNowActivityRepository.update(
      { id },
      { status: ActivityStatus.COMPLETED },
    );
    await this.buyNowActivityRepository.softDelete({ id });
  }

  async deleteBuyNowActivities(ids: number[]) {
    await Promise.all(
      ids.map(async (id) => {
        await this.buyNowActivityRepository.update(
          { id },
          { status: ActivityStatus.COMPLETED },
        );

        await this.buyNowActivityRepository.softDelete({ id });
      }),
    );
  }

  getBuyNowFeePercent(): number {
    return this.feePercent;
  }

  getBuyNowActivitiesByInscriptionIds(
    inscriptionIds: number[],
  ): Promise<BuyNowActivity[]> {
    return this.buyNowActivityRepository.find({
      where: {
        inscriptionId: In(inscriptionIds),
      },
      relations: {
        user: true,
      },
    });
  }

  async getFloorPriceByCollectionIds(
    collectionIds: number[],
  ): Promise<{ floor_price: number; collection_id: number }[]> {
    if (collectionIds.length === 0) return [];

    const floorPriceActivity = await this.buyNowActivityRepository
      .createQueryBuilder('buy_now_activity')
      .select([
        'Min(buy_now_activity.price) as floor_price',
        'collection.id as collection_id',
      ])
      .leftJoin('buy_now_activity.inscription', 'inscription')
      .leftJoin('inscription.collection', 'collection')
      .where(`collection.id IN (${collectionIds.join(',')})`)
      .groupBy('collection.id')
      .getRawMany();

    return floorPriceActivity;
  }

  async getRecentActivities(): Promise<BuyNowActivity[]> {
    const buyNowActivities = await this.buyNowActivityRepository.find({
      select: {
        inscription: {
          inscriptionId: true,
          collection: {
            name: true,
            description: true,
            imgUrl: true,
          },
        },
      },
      order: { updatedAt: 'DESC' },
      take: 3,
      relations: { inscription: { collection: true } },
    });

    buyNowActivities.forEach((buyNowActivity) => {
      delete buyNowActivity.id;
      delete buyNowActivity.createdAt;
      delete buyNowActivity.updatedAt;
      delete buyNowActivity.deletedAt;
      delete buyNowActivity.uuid;
      delete buyNowActivity.inscriptionId;
      delete buyNowActivity.userId;
      delete buyNowActivity.status;
    });

    return buyNowActivities;
  }

  async getRecentUsers(): Promise<
    {
      address: string;
      name: string;
      totalSales: number;
    }[]
  > {
    const buyNowActivities = await this.buyNowActivityRepository.find({
      order: {
        updatedAt: 'DESC',
      },
      take: 8,
      select: ['userId'],
    });
    const userIds = buyNowActivities.map(
      (buyNowActivity) => buyNowActivity.userId,
    );

    if (userIds.length === 0) return [];

    const userInfos = await this.userService.getTotalSalesByUserId(userIds);
    const salesInfos = userInfos.map((user) => {
      return {
        name: user.name,
        address: user.address,
        totalSales:
          Math.floor((user.swap_sales + user.buy_now_sales) * 10 ** 8) /
          10 ** 8,
      };
    });

    return salesInfos;
  }

  async search(keyWord: string): Promise<BuyNowActivity[]> {
    const buyNowActivities = await this.buyNowActivityRepository.find({
      where: { inscription: { inscriptionId: Like(`%${keyWord}%`) } },
      select: {
        inscription: { inscriptionId: true },
      },
      relations: { inscription: true },
      order: { updatedAt: 'DESC' },
      take: 3,
    });

    buyNowActivities.forEach((buyNowActivity) => {
      delete buyNowActivity.id;
      delete buyNowActivity.uuid;
      delete buyNowActivity.status;
      delete buyNowActivity.inscriptionId;
      delete buyNowActivity.userId;
      delete buyNowActivity.createdAt;
      delete buyNowActivity.updatedAt;
      delete buyNowActivity.deletedAt;
    });

    return buyNowActivities;
  }

  async getTotalSalesByCollectionIds(
    ids: number[],
  ): Promise<{ total_sales: number; collection_id: number }[]> {
    const totalSales = await this.buyNowActivityRepository
      .createQueryBuilder('buy_now_activity')
      .select([
        'SUM(buy_now_activity.price) as total_sales',
        'collection.id as collection_id',
      ])
      .leftJoin('buy_now_activity.inscription', 'inscription')
      .leftJoin('inscription.collection', 'collection')
      .where(`collection.id IN (${ids.join(',')})`)
      .andWhere(`buy_now_activity.status='${ActivityStatus.COMPLETED}'`)
      .groupBy('collection.id')
      .withDeleted()
      .getRawMany();

    return totalSales;
  }

  async getCountByCollectionIds(
    ids: number[],
  ): Promise<{ count: string; collection_id: number }[]> {
    const totalSales = await this.buyNowActivityRepository
      .createQueryBuilder('buy_now_activity')
      .select([
        'Count(buy_now_activity.price) as count',
        'collection.id as collection_id',
      ])
      .leftJoin('buy_now_activity.inscription', 'inscription')
      .leftJoin('inscription.collection', 'collection')
      .where(`collection.id IN (${ids.join(',')})`)
      .andWhere(`buy_now_activity.status='${ActivityStatus.CREATED}'`)
      .groupBy('collection.id')
      .getRawMany();

    return totalSales;
  }

  async getPopularCollectionIds(time: number): Promise<number[]> {
    const now = new Date();
    now.setDate(now.getDate() - time);
    const buyNowActivities = await this.buyNowActivityRepository
      .createQueryBuilder('buy_now_activity')
      .select(['inscription.collection_id as collection_id'])
      .withDeleted()
      .where(`buy_now_activity.status='${ActivityStatus.COMPLETED}'`)
      .andWhere(`buy_now_activity.updated_at > :date`, { date: now })
      .leftJoin('buy_now_activity.inscription', 'inscription')
      .groupBy('inscription.collection_id')
      .getRawAndEntities();
    const collectionIds = buyNowActivities.raw.map(
      (buyNowActivity) => buyNowActivity.collection_id,
    );

    return collectionIds;
  }

  async getTopPriceInscription(): Promise<BuyNowActivity> {
    const buyNowActivityId = await this.buyNowActivityRepository
      .createQueryBuilder('buy_now_activity')
      .select(['Max(price) as price', 'id'])
      .groupBy('id')
      .orderBy('updated_at', 'DESC')
      .getRawOne();

    if (!buyNowActivityId)
      throw new BadRequestException('There is no buy now activity');

    const buyNowActivity = await this.buyNowActivityRepository.findOne({
      where: {
        id: buyNowActivityId.id,
      },
      relations: {
        inscription: {
          collection: true,
        },
        user: true,
      },
      select: {
        inscription: {
          inscriptionId: true,
          collection: {
            imgUrl: true,
            description: true,
            name: true,
          },
        },
        user: {
          name: true,
          address: true,
        },
      },
    });

    delete buyNowActivity.id;
    delete buyNowActivity.uuid;
    delete buyNowActivity.status;
    delete buyNowActivity.inscriptionId;
    delete buyNowActivity.userId;
    delete buyNowActivity.createdAt;
    delete buyNowActivity.updatedAt;
    delete buyNowActivity.deletedAt;

    return buyNowActivity;
  }
}
