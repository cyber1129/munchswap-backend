import { Controller, forwardRef, Inject, Get } from '@nestjs/common';

import { AuthService } from '@src/auth/auth.service';
import { UserService } from './user.service';

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}
}
