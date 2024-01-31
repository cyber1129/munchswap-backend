import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '@src/auth/auth.module';
import { UserExistsByAddressValidator } from './validator/user-exists-by-address.validator';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [UserService, UserRepository, UserExistsByAddressValidator],
  exports: [UserService, UserRepository],
})
export class UserModule {}
