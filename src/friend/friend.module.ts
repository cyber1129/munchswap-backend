import { Module } from '@nestjs/common';

import { UserModule } from '@src/user/user.module';
import { UserService } from '@src/user/user.service';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';
import { FriendRepository } from './friend.repository';

@Module({
  imports: [UserModule],
  controllers: [FriendController],
  providers: [FriendService, FriendRepository, UserService],
})
export class FriendModule {}
