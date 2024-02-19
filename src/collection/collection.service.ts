import { BadRequestException, Injectable } from '@nestjs/common';

import { InscriptionService } from '@src/inscription/inscription.service';
import { PageOptionsDto } from '@src/common/pagination/pagination.types';
import { CollectionRepository } from './colletion.repository';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { Collection } from './collection.entity';
import { PsbtService } from '@src/psbt/psbt.service';

@Injectable()
export class CollectionService {
  constructor(
    private collectionRepository: CollectionRepository,
    private inscriptionService: InscriptionService,
    private psbtService: PsbtService,
  ) {
    this.addTempCollection();
  }

  async addTempCollection() {
    const count = await this.collectionRepository.count();

    if (count > 0) return;

    const collectionEntity = this.collectionRepository.create();
    this.collectionRepository.save(collectionEntity);
  }

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
      select: {
        id: true,
        imgUrl: true,
        name: true,
        description: true,
        website: true,
        discord: true,
        twitter: true,
      },
    });

    if (!collection)
      throw new BadRequestException('Can not find that collection');

    const inscriptions = await this.inscriptionService.getPaginatedInscriptions(
      collection.id,
      pageOptionsDto,
    );

    const inscriptionDatas = await Promise.all(
      inscriptions.data.map((inscriptionId) =>
        this.psbtService.getInscriptionWithUtxo(inscriptionId),
      ),
    );

    collection['inscriptions'] = {
      data: inscriptionDatas,
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
