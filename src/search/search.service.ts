import { Injectable } from '@nestjs/common';
import { validate, getAddressInfo } from 'bitcoin-address-validation';

import { CollectionService } from '@src/collection/collection.service';
import { InscriptionService } from '@src/inscription/inscription.service';
import { PsbtService } from '@src/psbt/psbt.service';
import { UserService } from '@src/user/user.service';
import { ConfigService } from '@nestjs/config';

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
  ) {
    this.network = this.configService.get('psbtConfig.network');
  }

  async search(keyWord: string) {
    const isAddress = validate(keyWord, this.network);

    if (isAddress) {
      const [inscription, collection, address] = await Promise.all([
        {},
        this.searchCollection(keyWord),
        [{ address: keyWord }],
      ]);

      return { inscription, collection, address };
    } else {
      const [inscription, collection, address] = await Promise.all([
        keyWord.length === 66 ? this.searchInscription(keyWord) : [],
        this.searchCollection(keyWord),
        {},
      ]);

      return { inscription, collection, address };
    }
  }

  async searchCollection(keyword: string) {
    return this.collectionService.search(keyword);
  }

  async searchInscription(inscriptionId: string) {
    try {
      const [inscription, inscriptionUtxo] = await Promise.all([
        this.inscriptionService.search(inscriptionId),
        this.psbtService.getInscriptionWithUtxo(inscriptionId),
      ]);

      return { ...inscriptionUtxo, ...inscription };
    } catch (_error) {
      return {};
    }
  }

  async searchByAddress(address: string) {
    try {
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

      return allowInscriptions.map((inscription) => {
        const collection = collectionInfos.find(
          (collectionInfo) =>
            collectionInfo.inscriptionId === inscription.inscriptionId,
        );

        if (!collection) return { ...inscription };
        return { ...inscription, collection: { ...collection.collection } };
      });
    } catch (error) {
      return {};
    }
  }
}
