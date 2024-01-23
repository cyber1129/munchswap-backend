import { Module } from '@nestjs/common';

import { CollectionModule } from '@src/collection/collection.module';
import { UserModule } from '@src/user/user.module';
import { InscriptionModule } from '@src/inscription/inscription.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [InscriptionModule, CollectionModule, UserModule],
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}
