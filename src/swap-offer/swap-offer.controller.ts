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
import { BuyerSignPsbtDto } from './dto/buyer-sign-psbt.dto';
import { OwnerSignPsbtDto } from './dto/owner-sign-psbt.dto';
import {
  PageDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { GenerateSwapPsbtDto } from './dto/generate-swap-psbt.dto';
import { CancelSwapOfferDto } from './dto/cancel-swap-offer.dto';
import { SwapOfferService } from './swap-offer.service';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
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

  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ description: `Buyer sign psbt`, tags: ['Swap offer'] })
  // @ApiResponse(ApiResponseHelper.success(SignPsbtResult, HttpStatus.CREATED))
  // @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  // @Post('/buyer-sign-psbt')
  // async buyerSignPsbt(
  //   @Request() req,
  //   @Body() body: BuyerSignPsbtDto,
  // ): Promise<{ msg: string }> {
  //   await this.swapOfferService.buyerSignPsbt(body, req.user.address);

  //   return {
  //     msg: 'Congratulations! Successfully created a swap offer',
  //   };
  // }

  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ description: `Owner sign psbt`, tags: ['Swap offer'] })
  // @ApiResponse(ApiResponseHelper.success(SignPsbtResult, HttpStatus.CREATED))
  // @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  // @Post('/owner-sign-psbt')
  // async ownerSignPsbt(
  //   @Request() req,
  //   @Body() body: OwnerSignPsbtDto,
  // ): Promise<PushTxResult> {
  //   const txId = await this.swapOfferService.ownerSignPsbt(
  //     body,
  //     req.user.address,
  //   );

  //   return {
  //     msg: 'Congratulations! Successfully accepted a swap offer',
  //     txId,
  //   };
  // }

  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ description: `Get active offers`, tags: ['Swap offer'] })
  // @ApiResponse(ApiResponseHelper.success(PageDto<SwapOffer>, HttpStatus.OK))
  // @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  // @Get('/active-offers')
  // async getActiveOffers(
  //   @Request() req,
  //   @Query() pageOptionsDto: PageOptionsDto,
  // ) {
  //   return this.swapOfferService.getActiveOffers(
  //     req.user.address,
  //     pageOptionsDto,
  //   );
  // }

  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ description: `Get pending offers` })
  // @ApiResponse(ApiResponseHelper.success(PageDto<SwapOffer>, HttpStatus.OK))
  // @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  // @Get('/pending-offers')
  // async getPendingOffers(
  //   @Request() req,
  //   @Query() pageOptionsDto: PageOptionsDto,
  // ) {
  //   return this.swapOfferService.getPendingOffers(
  //     req.user.address,
  //     pageOptionsDto,
  //   );
  // }
}
