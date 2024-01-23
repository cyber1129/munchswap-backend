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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Update user information`, tags: ['User'] })
  @ApiResponse(ApiResponseHelper.success(AccessToken, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('user/update')
  async updateUserProfile(
    @Body() body: UpdateUserDto,
    @Request() req,
  ): Promise<AccessToken> {
    const user = await this.userService.update(req.user.uuid, body);
    const accessToken = await this.authService.createAccessToken(user);
    return {
      accessToken,
    };
  }

  @ApiOperation({ description: `Get bitcoin price`, tags: ['User'] })
  @ApiResponse(ApiResponseHelper.success(BtcPrice, HttpStatus.OK))
  @Get('btc-price')
  async getBtcPrice(): Promise<BtcPrice> {
    const price = await this.userService.getBtcPrice();
    return { price };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Get user total sales`, tags: ['User'] })
  @ApiResponse(ApiResponseHelper.success(TotalSales, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('user/total-sales')
  async getTotalSales(@Request() req): Promise<TotalSales> {
    const totalSales = await this.userService.getTotalSales(req.user.address);
    return { totalSales };
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

  @ApiOperation({ description: `Get top sellers`, tags: ['User'] })
  @ApiResponse(
    ApiResponseHelper.success(
      PageDto<{ totalSales: number; address: string; name: string }>,
      HttpStatus.OK,
    ),
  )
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('user/sellers')
  async getTopSellers(
    @Query() pageOptionsDto: GetTopSellersPageDto,
  ): Promise<PageDto<{ totalSales: number; address: string; name: string }>> {
    return this.userService.getTopSellers(pageOptionsDto);
  }
}
