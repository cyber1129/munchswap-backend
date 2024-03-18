import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '@src/auth/auth.module';
import { UserExistsByAddressValidator } from './validator/user-exists-by-address.validator';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { WalletModule } from '@src/wallet/wallet.module';
import { WalletService } from '@src/wallet/wallet.service';

@Module({
  imports: [forwardRef(() => AuthModule), WalletModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserExistsByAddressValidator,
    WalletService,
  ],
  exports: [UserService, UserRepository],
})
export class UserModule {}
