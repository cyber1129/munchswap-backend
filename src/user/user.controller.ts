import {
  Controller,
  HttpStatus,
  forwardRef,
  Inject,
  Get,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { AuthService } from '@src/auth/auth.service';
import { UserService } from './user.service';
import { BtcPrice } from './user.type';

@Controller()
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @ApiOperation({ description: `Get bitcoin price`, tags: ['User'] })
  @ApiResponse(ApiResponseHelper.success(BtcPrice, HttpStatus.OK))
  @Get('btc-price')
  async getBtcPrice(): Promise<BtcPrice> {
    const price = await this.userService.getBtcPrice();
    return { price };
  }
}
