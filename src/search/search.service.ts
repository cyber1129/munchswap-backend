import { Injectable } from '@nestjs/common';

import { CollectionService } from '@src/collection/collection.service';
import { InscriptionService } from '@src/inscription/inscription.service';
import { UserService } from '@src/user/user.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly inscriptionService: InscriptionService,
    private readonly collectionService: CollectionService,
    private readonly userService: UserService,
  ) {}

  async search(keyWord: string) {
    const [inscriptions, collections, users] = await Promise.all([
      this.inscriptionService.search(keyWord),
      this.collectionService.search(keyWord),
      this.userService.search(keyWord),
    ]);

    return { inscriptions, collections, users };
  }
}
