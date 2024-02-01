import { Module } from '@nestjs/common';

import { CollectionModule } from '@src/collection/collection.module';
import { UserModule } from '@src/user/user.module';
import { InscriptionModule } from '@src/inscription/inscription.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PsbtModule } from '@src/psbt/psbt.module';
import { PsbtService } from '@src/psbt/psbt.service';

@Module({
  imports: [InscriptionModule, CollectionModule, UserModule, PsbtModule],
  providers: [SearchService, PsbtService],
  controllers: [SearchController],
})
export class SearchModule {}
