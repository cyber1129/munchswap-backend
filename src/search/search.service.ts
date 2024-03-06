import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { validate, getAddressInfo } from 'bitcoin-address-validation';

import { CollectionService } from '@src/collection/collection.service';
import { InscriptionService } from '@src/inscription/inscription.service';
import { PsbtService } from '@src/psbt/psbt.service';
import { UserService } from '@src/user/user.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export const AllowedContentTypes = [
  'image/svg+xml',
  'image/apng',
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/html',
  'text/html;charset=utf-8',
];

@Injectable()
export class SearchService {
  private network;

  constructor(
    private readonly inscriptionService: InscriptionService,
    private readonly collectionService: CollectionService,
    private readonly userService: UserService,
    private readonly psbtService: PsbtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheService: Cache,
  ) {
    this.network = this.configService.get('psbtConfig.network');
  }

  async search(keyWord: string) {
    const isAddress = validate(keyWord, this.network);

    if (
      isAddress &&
      (keyWord.startsWith('bc1p') || keyWord.startsWith('tbc1p'))
    ) {
      const [inscription, collection, address] = await Promise.all([
        {},
        this.searchCollection(keyWord),
        [{ address: keyWord }],
      ]);

      return { inscription, collection, address };
    } else {
      const [inscription, collection, address] = await Promise.all([
        this.searchInscription(keyWord),
        this.searchCollection(keyWord),
        {},
      ]);

      return { inscription, collection, address };
    }
  }

  async searchCollection(keyword: string) {
    return this.collectionService.search(decodeURI(keyword));
  }

  async searchInscription(inscriptionId: string) {
    try {
      const [inscription, inscriptionUtxo] = await Promise.all([
        this.inscriptionService.search(inscriptionId),
        this.psbtService.getInscriptionWithUtxo(inscriptionId),
      ]);

      const contentType = AllowedContentTypes.find(
        (contentType) => contentType === inscriptionUtxo.contentType,
      );

      if (contentType) return { ...inscriptionUtxo, ...inscription };
      return [];
    } catch (_error) {
      return {};
    }
  }

  async searchByAddress(address: string) {
    try {
      if (address.startsWith('bc1p') || address.startsWith('tbc1p'))
        throw new BadRequestException('The address should be taproot');

      const cachedData = await this.cacheService.get<any>(address);
      if (cachedData) return cachedData;

      const inscriptions = await this.psbtService.getInscriptionByAddress(
        address,
      );

      const allowInscriptions = inscriptions.filter((inscription) =>
        AllowedContentTypes.find(
          (contentType) => contentType === inscription.contentType,
        ),
      );

      const inscriptionIds = allowInscriptions.map(
        (inscription) => inscription.inscriptionId,
      );
      const collectionInfos =
        await this.inscriptionService.findInscriptionByIdsWithCollection(
          inscriptionIds,
        );

      const addressInscriptions = allowInscriptions.map((inscription) => {
        const collection = collectionInfos.find(
          (collectionInfo) =>
            collectionInfo.inscriptionId === inscription.inscriptionId,
        );

        if (!collection) return { ...inscription };
        return { ...inscription, collection: { ...collection.collection } };
      });

      await this.cacheService.set(address, addressInscriptions);
      return addressInscriptions;
    } catch (error) {
      return {};
    }
  }
}
