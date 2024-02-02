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
  ): Promise<{ psbt: string }> {
    const { psbt } = await this.swapOfferService.generatePsbt({
      address: req.user.address,
      buyerInscriptionIds: body.buyerInscriptionIds,
      sellerInscriptionIds: body.sellerInscriptionIds,
      walletType: body.walletType,
      price: body.price,
      expiredIn: body.expiredIn,
    });

    return {
      psbt,
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
      msg: 'You successfully canceled an swap offer',
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
      msg: 'Congratulations! Successfully created a swap offer',
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
      msg: 'Congratulations! Successfully accepted a swap offer',
      txId,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Get active offers`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(PageDto<SwapOffer>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/active-offers')
  async getActiveOffers(
    @Request() req,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.swapOfferService.getActiveOffers(
      req.user.address,
      pageOptionsDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Get history`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(PageDto<SwapOffer>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/history')
  async getPushedOffers(
    @Request() req,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.swapOfferService.getPushedOffers(
      req.user.address,
      pageOptionsDto,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ description: `Get swap offer details`, tags: ['Swap offer'] })
  @ApiResponse(ApiResponseHelper.success(SwapOffer, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/uuid/:uuid')
  async getSwapofferById(@Param('uuid') uuid: string) {
    return this.swapOfferService.getSwapOfferById(uuid);
  }
}
