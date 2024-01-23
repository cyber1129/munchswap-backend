import {
  BadRequestException,
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '@src/auth/guards/jwt-auth.guard';
import { Role } from '@src/auth/role/role.decorator';
import { RoleGuard } from '@src/auth/role/role.guard';
import {
  PageDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { InscriptionService } from './inscription.service';
import { InscriptionInfo } from './inscription.type';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';

@Controller('inscription')
export class InscriptionController {
  constructor(private inscriptionService: InscriptionService) {}

  @ApiOperation({
    description: `Get inscription buy now price information`,
    tags: ['Inscription'],
  })
  @ApiResponse(ApiResponseHelper.success(InscriptionInfo, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/inscription-info/:inscriptionId')
  async getInscriptionInfo(@Param('inscriptionId') inscriptionId: string) {
    const inscriptionInfo = await this.inscriptionService.getInscriptionInfo(
      inscriptionId,
    );

    delete inscriptionInfo.id;
    delete inscriptionInfo.uuid;
    delete inscriptionInfo.collectionId;
    delete inscriptionInfo.createdAt;
    delete inscriptionInfo.updatedAt;
    delete inscriptionInfo.deletedAt;

    if (inscriptionInfo) return inscriptionInfo;

    throw new BadRequestException(
      'Can not find an information of this inscription',
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Get owned inscription infos`,
    tags: ['Inscription'],
  })
  @ApiResponse(
    ApiResponseHelper.success(PageDto<InscriptionInfo>, HttpStatus.OK),
  )
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/inscriptions')
  async getInscriptions(
    @Request() req,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.inscriptionService.getOwnedInscriptions(
      req.user.address,
      pageOptionsDto,
    );
  }

  @ApiOperation({ description: `Get owned inscription infos by user name`, tags: ['Inscription'], })
  @ApiResponse(
    ApiResponseHelper.success(PageDto<InscriptionInfo>, HttpStatus.OK),
  )
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/inscriptions/:userName')
  async getInscriptionsByUserName(
    @Param('userName') userName: string,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.inscriptionService.getOwnedInscriptionsByUserName(
      userName,
      pageOptionsDto,
    );
  }
}
