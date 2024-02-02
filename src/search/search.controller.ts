import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';

import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchResult } from './search.type';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation({
    description: `Search inscriptions`,
    tags: ['Search'],
  })
  @ApiResponse(ApiResponseHelper.success(SearchResult, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get()
  async search(@Query() body: SearchDto) {
    return this.searchService.search(body.keyword);
  }

  @ApiOperation({
    description: `Search inscriptions by address`,
    tags: ['Search'],
  })
  @ApiResponse(ApiResponseHelper.success(SearchResult, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/address/:address')
  async searchByAddress(@Param('address') address: string) {
    return this.searchService.searchByAddress(address);
  }

  @ApiOperation({
    description: `Search inscriptions by inscription id`,
    tags: ['Search'],
  })
  @ApiResponse(ApiResponseHelper.success(SearchResult, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/inscription/:inscriptionId')
  async searchByInscriptionID(@Param('inscriptionId') inscriptionId: string) {
    return this.searchService.searchInscription(inscriptionId);
  }
}
