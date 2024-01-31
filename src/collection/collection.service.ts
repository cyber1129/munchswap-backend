import { BadRequestException, Injectable } from '@nestjs/common';

import { InscriptionService } from '@src/inscription/inscription.service';
import { PageOptionsDto } from '@src/common/pagination/pagination.types';
import { CollectionRepository } from './colletion.repository';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { Collection } from './collection.entity';

@Injectable()
export class CollectionService {
  constructor(
    private collectionRepository: CollectionRepository,
    private inscriptionService: InscriptionService,
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

    collection['inscriptions'] = {
      data: inscriptions,
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

    return collections;
  }
}
