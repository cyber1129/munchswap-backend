import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '@src/auth/guards/jwt-auth.guard';
import { Role } from '@src/auth/role/role.decorator';
import {
  PageDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { RoleGuard } from '@src/auth/role/role.guard';
import { CancelBuyNowOfferDto } from './dto/cancel-buy-now-offer.dto';
import { BuyNowOfferService } from './buy-now-offer.service';
import { GenerateBuyNowPsbtDto } from './dto/generate-buy-now-psbt.dto';
import { BuyerSignPsbtDto } from './dto/buyer-sign-psbt.dto';
import { OwnerSignPsbtDto } from './dto/owner-sign-psbt.dto';
import { SetBuyNowOfferAsReadDto } from './dto/set-buy-now-offer-as-read.dto';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import {
  GeneratePbst,
  PushTxResult,
  SignPsbtResult,
} from './buy-now-offer.type';
import { BuyNowOffer } from './buy-now-offer.entity';

@Controller('buy-now-offer')
export class BuyNowOfferController {
  constructor(private buyNowOfferService: BuyNowOfferService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Generate buy now psbt`,
    tags: ['Buw now offer'],
  })
  @ApiResponse(ApiResponseHelper.success(GeneratePbst, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/generate-psbt')
  async generatePsbt(
    @Request() req,
    @Body() body: GenerateBuyNowPsbtDto,
  ): Promise<GeneratePbst> {
    const { psbt, inputCount } = await this.buyNowOfferService.generatePsbt({
      buyerPubkey: body.buyerPubkey,
      inscriptionId: body.inscriptionId,
      recipient: req.user.address,
      walletType: body.walletType,
      expiredIn: body.expiredIn,
    });

    return {
      psbt,
      inputCount,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Buyer sign psbt`, tags: ['Buw now offer'] })
  @ApiResponse(ApiResponseHelper.success(SignPsbtResult, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/buyer-sign-psbt')
  async buyerSignPsbt(
    @Request() req,
    @Body() body: BuyerSignPsbtDto,
  ): Promise<SignPsbtResult> {
    const res = await this.buyNowOfferService.buyerSignPsbt(
      body,
      req.user.address,
    );

    return {
      msg: 'Congratulations! Successfully created a buy now offer',
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Owner sign psbt`, tags: ['Buw now offer'] })
  @ApiResponse(ApiResponseHelper.success(PushTxResult, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/owner-sign-psbt')
  async ownerSignPsbt(
    @Request() req,
    @Body() body: OwnerSignPsbtDto,
  ): Promise<PushTxResult> {
    const txId = await this.buyNowOfferService.ownerSignPsbt(
      body,
      req.user.address,
    );

    return {
      msg: 'Congratulations! Successfully accepted a buy now offer',
      txId,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Cancel buy now offer`,
    tags: ['Buw now offer'],
  })
  @ApiResponse(ApiResponseHelper.success(SignPsbtResult, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/cancel')
  async cancelBuyNowOffer(
    @Request() req,
    @Body() body: CancelBuyNowOfferDto,
  ): Promise<{ msg: string }> {
    await this.buyNowOfferService.cancelBuyNowOffer(
      body.uuid,
      req.user.address,
    );

    return {
      msg: 'You successfully canceled an buy now offer',
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Get active offers`,
    tags: ['Buw now offer'],
  })
  @ApiResponse(ApiResponseHelper.success(PageDto<BuyNowOffer>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/active-offers')
  async getActiveOffers(
    @Request() req,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.buyNowOfferService.getActiveOffers(
      req.user.address,
      pageOptionsDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Get pending offers`,
    tags: ['Buw now offer'],
  })
  @ApiResponse(ApiResponseHelper.success(PageDto<BuyNowOffer>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/pending-offers')
  async getPendingOffers(
    @Request() req,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.buyNowOfferService.getPendingOffers(
      req.user.address,
      pageOptionsDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Set buy now offer as read`,
    tags: ['Buw now offer'],
  })
  @ApiResponse(ApiResponseHelper.success(SignPsbtResult, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/set-as-read')
  async setAdRead(@Request() req, @Body() body: SetBuyNowOfferAsReadDto) {
    await this.buyNowOfferService.setAsRead(body.uuid);

    return { msg: 'Success' };
  }

  @ApiOperation({
    description: `Get recent sales inscription`,
    tags: ['Buw now offer'],
  })
  @ApiResponse(ApiResponseHelper.success(PageDto<BuyNowOffer>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/recent-sales')
  async getRecentSales() {
    return this.buyNowOfferService.getRecentSales();
  }
}
