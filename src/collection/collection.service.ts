import { BadRequestException, Injectable } from '@nestjs/common';
import { CollectionRepository } from './colletion.repository';
import { In } from 'typeorm';

import { InscriptionService } from '@src/inscription/inscription.service';
import { PageOptionsDto } from '@src/common/pagination/pagination.types';
import { BuyNowActivityService } from '@src/buy-now-activity/buy-now-activity.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { Collection } from './collection.entity';
import { DiscoverCollection } from './collection.type';

@Injectable()
export class CollectionService {
  constructor(
    private collectionRepository: CollectionRepository,
    private inscriptionService: InscriptionService,
    private buyNowActivityService: BuyNowActivityService,
  ) {}

  async createCollection(body: CreateCollectionDto) {
    const collection: Partial<Collection> = {
      ...body,
    };
    const savedCollection = await this.collectionRepository.save(collection);

    const saveInscriptions = body.inscriptionIds.map(
      async (inscriptionId: string) => {
        return this.inscriptionService.createInscription(
          savedCollection.id,
          inscriptionId,
        );
      },
    );
    await Promise.all(saveInscriptions);

    return this.collectionRepository.findOne({
      where: {
        id: savedCollection.id,
      },
      relations: {
        inscription: true,
      },
    });
  }

  async getDiscoverCollectionDatas() {
    const collections = await this.collectionRepository.find({
      select: ['id', 'name', 'imgUrl', 'description'],
      take: 6,
      order: {
        createdAt: 'ASC',
      },
    });

    const collectionIds = collections.map((collection) => collection.id);

    const floorPrices =
      await this.buyNowActivityService.getFloorPriceByCollectionIds(
        collectionIds,
      );

    const pageOptionsDto: PageOptionsDto = {
      take: 3,
      skip: 0,
    };

    const inscriptionDatas = await Promise.all(
      collections.map((collection) =>
        this.inscriptionService.getPaginatedInscriptions(
          collection.id,
          pageOptionsDto,
        ),
      ),
    );

    collections.map((collection, index) => {
      const floorPrice = floorPrices.find(
        (floorPrice) => floorPrice.collection_id === collection.id,
      );

      collection['inscriptions'] = {
        data: inscriptionDatas[index].data.map((inscription) => {
          return {
            inscriptionId: inscription.inscriptionId,
          };
        }),
      };

      collection['itemCount'] = inscriptionDatas[index].meta.itemCount;
      collection['floorPrice'] = floorPrice?.floor_price;

      delete collection.id;
    });

    return collections;
  }

  async getCollectionInfo(
    collectionName: string,
    pageOptionsDto: PageOptionsDto,
  ): Promise<Collection> {
    const collection = await this.collectionRepository.findOne({
      where: {
        name: collectionName,
      },
      select: [
        'id',
        'imgUrl',
        'name',
        'description',
        'website',
        'discord',
        'twitter',
      ],
    });

    if (!collection)
      throw new BadRequestException('Can not find that collection');

    const inscriptions = await this.inscriptionService.getPaginatedInscriptions(
      collection.id,
      pageOptionsDto,
    );

    const inscriptionIds = inscriptions.data.map(
      (inscription) => inscription.id,
    );

    const buyNowActivityInfos =
      await this.buyNowActivityService.getBuyNowActivitiesByInscriptionIds(
        inscriptionIds,
      );

    const inscriptionInfos = inscriptions.data.map((inscription) => {
      const buyNowActivity = buyNowActivityInfos.find(
        (buyNowActivity) => buyNowActivity.inscriptionId === inscription.id,
      );
      return {
        inscriptionId: inscription.inscriptionId,
        price: buyNowActivity?.price,
        userAddress: buyNowActivity?.user.address,
      };
    });

    collection['inscriptions'] = {
      data: inscriptionInfos,
      meta: inscriptions.meta,
    };

    return collection;
  }

  async search(keyWord: string): Promise<Partial<Collection>[]> {
    const searchResult = await this.collectionRepository
      .createQueryBuilder('collection')
      .where('LOWER(name) LIKE LOWER(:search)', {
        search: `%${keyWord}%`,
      })
      .orderBy('updated_at', 'DESC')
      .getRawAndEntities();

    const collections = searchResult.entities.map((collection) => {
      return {
        id: collection.id,
        name: collection.name,
        imgUrl: collection.imgUrl,
      };
    });

    const collectionIds = collections.map((collection) => collection.id);

    const floorPrices =
      await this.buyNowActivityService.getFloorPriceByCollectionIds(
        collectionIds,
      );

    collections.forEach((collection) => {
      const floorPrice = floorPrices.find(
        (floorPrice) => floorPrice.collection_id === collection.id,
      );
      if (floorPrice) collection['floorPrice'] = floorPrice.floor_price;
      delete collection.id;
    });

    return collections;
  }

  async getPopularCollections(time: number): Promise<Collection[]> {
    const collectionIds =
      await this.buyNowActivityService.getPopularCollectionIds(time);

    const [collections, floorPrices] = await Promise.all([
      this.collectionRepository.find({
        where: {
          id: In(collectionIds),
        },
        select: {
          id: true,
          name: true,
          imgUrl: true,
          description: true,
        },
      }),
      this.buyNowActivityService.getFloorPriceByCollectionIds(collectionIds),
    ]);

    collections.forEach((collection) => {
      const floorPrice = floorPrices.find(
        (floorPrice) => floorPrice.collection_id === collection.id,
      );

      if (floorPrice) collection['floorPrice'] = floorPrice.floor_price;
      delete collection.id;
    });

    return collections;
  }

  async getCollectionDetails(collectionName: string) {
    const [collection] = await this.collectionRepository.find({
      where: { name: collectionName },
      select: {
        inscription: { inscriptionId: true },
      },
      relations: {
        inscription: true,
      },
    });

    if (!collection)
      throw new BadRequestException('Can not find the collection');

    const [floorPrice, totalSales, count] = await Promise.all([
      this.buyNowActivityService.getFloorPriceByCollectionIds([collection.id]),
      this.buyNowActivityService.getTotalSalesByCollectionIds([collection.id]),
      this.buyNowActivityService.getCountByCollectionIds([collection.id]),
    ]);

    return {
      totalCount: collection.inscription.length,
      listedItems: count.length > 0 ? Number(count[0].count) : 0,
      floorPrice: floorPrice.length > 0 ? floorPrice[0].floor_price : 0,
      totalSales: totalSales.length > 0 ? totalSales[0].total_sales : 0,
    };
  }
}
