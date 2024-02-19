import { Module } from '@nestjs/common';

import { InscriptionModule } from '@src/inscription/inscription.module';
import { InscriptionService } from '@src/inscription/inscription.service';
import { UserModule } from '@src/user/user.module';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { CollectionRepository } from './colletion.repository';
import { PsbtModule } from '@src/psbt/psbt.module';
import { PsbtService } from '@src/psbt/psbt.service';

@Module({
  imports: [InscriptionModule, UserModule, PsbtModule],
  controllers: [CollectionController],
  providers: [CollectionService, CollectionRepository, InscriptionService, PsbtService],
  exports: [CollectionService],
})
export class CollectionModule {}
