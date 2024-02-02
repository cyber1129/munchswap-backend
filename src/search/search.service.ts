import { Injectable } from '@nestjs/common';

import { CollectionService } from '@src/collection/collection.service';
import { InscriptionService } from '@src/inscription/inscription.service';
import { PsbtService } from '@src/psbt/psbt.service';
import { UserService } from '@src/user/user.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly inscriptionService: InscriptionService,
    private readonly collectionService: CollectionService,
    private readonly userService: UserService,
    private readonly psbtService: PsbtService,
  ) {}

  async search(keyWord: string) {
    const [inscription, collection, address] = await Promise.all([
      this.searchInscription(keyWord),
      this.searchCollection(keyWord),
      this.searchByAddress(keyWord),
    ]);

    return { inscription, collection, address };
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
      console.log('getting inscripitons');

      const inscriptions = await this.psbtService.getInscriptionByAddress(
        address,
      );

      console.log('got inscriptions');

      const inscriptionIds = inscriptions.map(
        (inscription) => inscription.inscriptionId,
      );
      const collectionInfos =
        await this.inscriptionService.findInscriptionByIdsWithCollection(
          inscriptionIds,
        );

      return inscriptions.map((inscription) => {
        const collection = collectionInfos.find(
          (collectionInfo) =>
            collectionInfo.inscriptionId === inscription.inscriptionId,
        );

        return { ...inscription, collection };
      });
    } catch (error) {
      return {};
    }
  }
}
