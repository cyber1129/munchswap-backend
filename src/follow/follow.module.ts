import { Module } from '@nestjs/common';

import { UserModule } from '@src/user/user.module';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { FollowRepository } from './follow.repository';

@Module({
  imports: [UserModule],
  providers: [FollowService, FollowRepository],
  controllers: [FollowController],
})
export class FollowModule {}
