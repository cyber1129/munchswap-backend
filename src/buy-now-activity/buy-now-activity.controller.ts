import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '@src/auth/guards/jwt-auth.guard';
import { RoleGuard } from '@src/auth/role/role.guard';
import { Role } from '@src/auth/role/role.decorator';
import { CreateBuyNowActivityDto } from './dto/create-buy-now-activity.dto';
import { BuyNowActivityService } from './buy-now-activity.service';
import { BuyNowActivity } from './buy-now-activity.entity';
import { GetPaginatedInscriptionFilterDto } from './dto/get-paginated-inscription-filter.dto';
import { RemoveBuyNowActivityDto } from './dto/remove-buy-now-activity.dto';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import {
  BuyNowActivityInfo,
  BuyNowActivityInscriptionInfo,
  BuyNowActivityPrice,
  BuyNowPercentFeeRate,
  CreateBuyNowActivity,
  RecentUserInfo,
  RemoveBuyNowActivity,
} from './buy-now-activity.type';
import { PageDto } from '@src/common/pagination/pagination.types';

@Controller('buy-now-activity')
export class BuyNowActivityController {
  constructor(private buyNowActivityService: BuyNowActivityService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Create buy now activity`,
    tags: ['Buy now activity'],
  })
  @ApiResponse(
    ApiResponseHelper.success(CreateBuyNowActivity, HttpStatus.CREATED),
  )
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/create')
  async create(
    @Body() body: CreateBuyNowActivityDto,
    @Request() req,
  ): Promise<CreateBuyNowActivity> {
    const buyNowActivity =
      await this.buyNowActivityService.createBuyNowActivity(
        body,
        req.user.uuid,
      );

    return {
      price: buyNowActivity.price,
      inscriptionId: buyNowActivity.inscription.inscriptionId,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Remove buy now activity`,
    tags: ['Buy now activity'],
  })
  @ApiResponse(
    ApiResponseHelper.success(RemoveBuyNowActivity, HttpStatus.CREATED),
  )
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/remove')
  async remove(
    @Body() body: RemoveBuyNowActivityDto,
    @Request() req,
  ): Promise<RemoveBuyNowActivity> {
    return this.buyNowActivityService.removeBuyNowActivity(
      req.user.address,
      body.inscriptionId,
    );
  }

  @ApiOperation({
    description: `Get inscription buy now price information by inscription id`,
    tags: ['Buy now activity'],
  })
  @ApiResponse(ApiResponseHelper.success(BuyNowActivityPrice, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/inscription-price/:inscriptionId')
  async getInscriptionPrice(
    @Param('inscriptionId') inscriptionId,
  ): Promise<BuyNowActivityPrice> {
    const buyNowActivity = await this.buyNowActivityService.getBuyNowActivity(
      inscriptionId,
    );

    if (buyNowActivity)
      return {
        price: buyNowActivity.price,
      };

    throw new BadRequestException('Can not find Buy Now Activity');
  }

  @ApiOperation({
    description: `Get inscription info by inscription id`,
    tags: ['Buy now activity'],
  })
  @ApiResponse(
    ApiResponseHelper.success(BuyNowActivityInscriptionInfo, HttpStatus.OK),
  )
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/inscription-info/:inscriptionId')
  async getInscriptionInfo(
    @Param('inscriptionId') inscriptionId: string,
  ): Promise<BuyNowActivityInscriptionInfo> {
    const buyNowInscriptionData =
      await this.buyNowActivityService.getDiscoverBuyNowActivityByInscriptionId(
        inscriptionId,
      );

    return buyNowInscriptionData;
  }

  @ApiOperation({
    description: `Get inscription infos for discover page`,
    tags: ['Buy now activity'],
  })
  @ApiResponse(
    ApiResponseHelper.success(
      PageDto<BuyNowActivityInscriptionInfo>,
      HttpStatus.OK,
    ),
  )
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/discover')
  async getDiscoverDatas(
    @Query() pageOptionsDto: GetPaginatedInscriptionFilterDto,
  ): Promise<PageDto<BuyNowActivityInscriptionInfo>> {
    const buyNowActivities =
      await this.buyNowActivityService.getDiscoverBuyNowActivityDatas(
        pageOptionsDto,
      );

    const data = buyNowActivities.data.map((buyNowActivity) => {
      return {
        price: buyNowActivity.price,
        inscription: {
          inscriptionId: buyNowActivity.inscription.inscriptionId,
          collection: {
            name: buyNowActivity.inscription.collection.name,
            description: buyNowActivity.inscription.collection.description,
            imgUrl: buyNowActivity.inscription.collection.imgUrl,
          },
        },
        user: {
          name: buyNowActivity.user.name,
          address: buyNowActivity.user.address,
        },
      };
    });

    return { data, meta: buyNowActivities.meta };
  }

  @ApiOperation({
    description: `Get percent fee rate`,
    tags: ['Buy now activity'],
  })
  @ApiResponse(ApiResponseHelper.success(BuyNowPercentFeeRate, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/fee')
  getFeeRate(): BuyNowPercentFeeRate {
    const feePercent = this.buyNowActivityService.getBuyNowFeePercent();

    return {
      feePercent,
    };
  }

  @ApiOperation({
    description: `Get recent buy now activities`,
    tags: ['Buy now activity'],
  })
  @ApiResponse(ApiResponseHelper.success([BuyNowActivityInfo], HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/recent')
  async getRecentBuyNowActivities(): Promise<BuyNowActivityInfo[]> {
    return this.buyNowActivityService.getRecentActivities();
  }

  @ApiOperation({
    description: `Get recent users with total prices`,
    tags: ['Buy now activity'],
  })
  @ApiResponse(ApiResponseHelper.success([RecentUserInfo], HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/recent-user')
  async getRecentUsers(): Promise<RecentUserInfo[]> {
    return this.buyNowActivityService.getRecentUsers();
  }

  @ApiOperation({
    description: `Get top price inscription`,
    tags: ['Buy now activity'],
  })
  @ApiResponse(
    ApiResponseHelper.success(BuyNowActivityInscriptionInfo, HttpStatus.OK),
  )
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/top-price')
  async getTopPriceInscription(): Promise<BuyNowActivityInscriptionInfo> {
    return this.buyNowActivityService.getTopPriceInscription();
  }
}
