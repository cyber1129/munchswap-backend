import {
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
import {
  PageDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { BuyerSignPsbtDto } from './dto/buyer-sign-psbt.dto';
import { SellerSignPsbtDto } from './dto/seller-sign-psbt.dto';
import { GenerateSwapPsbtDto } from './dto/generate-swap-psbt.dto';
import { CancelSwapOfferDto } from './dto/cancel-swap-offer.dto';
import { SwapOfferService } from './swap-offer.service';
import { GeneratePbst, PushTxResult, SignPsbtResult } from './swap-offer.type';
import { SwapOffer } from './swap-offer.entity';
import { GetOfferDto } from './dto/get-offer.dto';
import { GetUserHistoryDto } from './dto/get-user-history.dto';

@Controller('swap-offer')
export class SwapOfferController {
  constructor(private swapOfferService: SwapOfferService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Generate swap psbt`,
    tags: ['Swap offer'],
  })
  @ApiResponse(ApiResponseHelper.success(GeneratePbst, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/generate-psbt')
  async generatePsbt(
    @Request() req,
    @Body() body: GenerateSwapPsbtDto,
  ): Promise<{
    psbt: string;
    buyerPaymentsignIndexes: number[];
    buyerTaprootsignIndexes: number[];
    offerId: string;
  }> {
    const { psbt, buyerPaymentsignIndexes, buyerTaprootsignIndexes, offerId } =
      await this.swapOfferService.generatePsbt({
        address: req.user.address,
        buyerInscriptionIds: body.buyerInscriptionIds,
        sellerInscriptionIds: body.sellerInscriptionIds,
        walletType: body.walletType,
        price: body.price,
        expiredIn: body.expiredIn,
      });

    return {
      psbt,
      buyerPaymentsignIndexes,
      buyerTaprootsignIndexes,
      offerId,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Cancel swap offer`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(SignPsbtResult, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/cancel')
  async cancelBuyNowOffer(
    @Request() req,
    @Body() body: CancelSwapOfferDto,
  ): Promise<{ msg: string }> {
    await this.swapOfferService.cancelSwapOffer(body.uuid, req.user.address);

    return {
      msg: 'Successfully cancelled the swap offer',
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Buyer sign psbt`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(SignPsbtResult, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/buyer-sign-psbt')
  async buyerSignPsbt(
    @Request() req,
    @Body() body: BuyerSignPsbtDto,
  ): Promise<{ msg: string; offerId: string }> {
    const offerUuid = await this.swapOfferService.buyerSignPsbt(
      body,
      req.user.address,
    );

    return {
      msg: 'Successfully created the swap offer',
      offerId: offerUuid,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Owner sign psbt`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(SignPsbtResult, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/seller-sign-psbt')
  async ownerSignPsbt(
    @Request() req,
    @Body() body: SellerSignPsbtDto,
  ): Promise<PushTxResult> {
    const txId = await this.swapOfferService.sellerSignPsbt(
      body,
      req.user.address,
    );

    return {
      msg: 'Successfully accepted the swap offer',
      txId,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Get Sending offers`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(PageDto<SwapOffer[]>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/user-sending-offers')
  async getUserSendingOffers(
    @Request() req,
    @Query() getOfferDto: GetOfferDto,
  ) {
    return this.swapOfferService.getUserSendingOffers(
      req.user.address,
      getOfferDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Get Getting offers`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(PageDto<SwapOffer[]>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/user-getting-offers')
  async getUserGettingOffers(
    @Request() req,
    @Query() getOfferDto: GetOfferDto,
  ) {
    return this.swapOfferService.getUserGettingOffers(
      req.user.address,
      getOfferDto,
    );
  }

  @ApiOperation({ description: `Get Sending offers`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(PageDto<SwapOffer[]>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/sending-offers')
  async getSendingOffers(@Query() getOfferDto: GetOfferDto) {
    return this.swapOfferService.getSendingOffers(getOfferDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Get user history`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(PageDto<SwapOffer>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/user-history')
  async getUserPushedOffers(
    @Request() req,
    @Query() getOfferDto: GetUserHistoryDto,
  ) {
    return this.swapOfferService.getUserPushedOffers(
      req.user.address,
      getOfferDto,
    );
  }

  @ApiOperation({ description: `Get history`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(PageDto<SwapOffer[]>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/history')
  async getPushedOffers(@Query() getOfferDto: GetOfferDto) {
    return this.swapOfferService.getPushedOffers(getOfferDto);
  }

  @ApiOperation({
    description: `Get supported collect deals`,
    tags: ['Swap offer'],
  })
  @ApiResponse(ApiResponseHelper.success(PageDto<SwapOffer[]>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/supported-collection')
  async getSupportedCollection() {
    return this.swapOfferService.getPushedOffersForSupportCollections();
  }

  @ApiOperation({ description: `Get swap offer details`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(SwapOffer, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/uuid/:uuid')
  async getSwapofferById(@Param('uuid') uuid: string) {
    return this.swapOfferService.getSwapOfferById(uuid);
  }
}
