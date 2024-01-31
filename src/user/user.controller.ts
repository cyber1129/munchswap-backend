import {
  Body,
  Controller,
  HttpStatus,
  Post,
  UseGuards,
  Request,
  forwardRef,
  Inject,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { JwtAuthGuard } from '@src/auth/guards/jwt-auth.guard';
import { AuthService } from '@src/auth/auth.service';
import { GetTopSellersPageDto } from './dto/get-top-sellers-page.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';
import { AccessToken } from '@src/auth/auth.type';
import { BtcPrice, TotalSales } from './user.type';
import { PageDto } from '@src/common/pagination/pagination.types';

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

  @ApiOperation({
    description: `Get user total sales by user address`,
    tags: ['User'],
  })
  @ApiResponse(ApiResponseHelper.success(TotalSales, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('user/total-sales/:userAddress')
  async getTotalSalesByAddress(
    @Param('userAddress') userAddress: string,
  ): Promise<TotalSales> {
    const totalSales = await this.userService.getTotalSales(userAddress);
    return { totalSales };
  }
}
