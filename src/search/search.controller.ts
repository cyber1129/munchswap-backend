import { Controller, Get, HttpStatus, Query } from '@nestjs/common';

import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchResult } from './search.type';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiOperation({
    description: `Get owned inscription infos`,
    tags: ['Inscription'],
  })
  @ApiResponse(ApiResponseHelper.success(SearchResult, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get()
  async search(@Query() body: SearchDto) {
    return this.searchService.search(body.keyword);
  }
}
