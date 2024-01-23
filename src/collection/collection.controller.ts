import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { JwtAuthGuard } from '@src/auth/guards/jwt-auth.guard';
import { RoleGuard } from '@src/auth/role/role.guard';
import { Role } from '@src/auth/role/role.decorator';
import { PageOptionsDto } from '@src/common/pagination/pagination.types';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { CollectionService } from './collection.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { GetPopularCollectionDto } from './dto/get-popular-collection.dto';
import { Collection } from './collection.entity';
import {
  CollectionDetailedInfo,
  CollectionInscriptions,
  DiscoverCollection,
  PopularCollection,
} from './collection.type';

@Controller('collection')
export class CollectionController {
  constructor(private collectionService: CollectionService) {}

  @ApiBearerAuth()
  @Role('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiOperation({ description: `Create a collection`, tags: ['Collection'] })
  @ApiResponse(ApiResponseHelper.success(Collection, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/create')
  async create(@Body() body: CreateCollectionDto): Promise<Collection> {
    return this.collectionService.createCollection(body);
  }

  @ApiOperation({
    description: `Get collection datas for discover page`,
    tags: ['Collection'],
  })
  @ApiResponse(ApiResponseHelper.success([DiscoverCollection], HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/discover')
  async getDiscoverDatas() {
    return this.collectionService.getDiscoverCollectionDatas();
  }

  @ApiOperation({
    description: `Get inscriptions by collection name`,
    tags: ['Collection'],
  })
  @ApiResponse(ApiResponseHelper.success(CollectionInscriptions, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/inscriptions/:collectionName')
  async getCollectionInfo(
    @Param('collectionName') collectionName: string,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.collectionService.getCollectionInfo(
      collectionName,
      pageOptionsDto,
    );
  }

  @ApiOperation({
    description: `Collection detailed info `,
    tags: ['Collection'],
  })
  @ApiResponse(ApiResponseHelper.success(CollectionDetailedInfo, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/info/:collectionName')
  async getCollectionDetails(@Param('collectionName') collectionName: string) {
    return this.collectionService.getCollectionDetails(collectionName);
  }

  @ApiOperation({
    description: `Get popular collections`,
    tags: ['Collection'],
  })
  @ApiResponse(ApiResponseHelper.success([PopularCollection], HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/popular')
  async getPopularCollection(@Query() body: GetPopularCollectionDto) {
    return this.collectionService.getPopularCollections(body.time);
  }
}
