import { Module } from '@nestjs/common';

import { UserModule } from '@src/user/user.module';
import { InscriptionService } from './inscription.service';
import { InscriptionRepository } from './inscription.repository';
import { InscriptionController } from './inscription.controller';

@Module({
  imports: [UserModule],
  providers: [InscriptionService, InscriptionRepository],
  exports: [InscriptionService, InscriptionRepository],
  controllers: [InscriptionController],
})
export class InscriptionModule {}
