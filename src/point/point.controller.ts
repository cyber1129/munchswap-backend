import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PointService, UserPoint } from './point.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@src/auth/guards/jwt-auth.guard';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { PageDto } from '@src/common/pagination/pagination.types';
import { GetUserPointDto } from './dto/get-user-point.dto';

@Controller('point')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @ApiOperation({
    description: `Get user points`,
    tags: ['point'],
  })
  @ApiResponse(ApiResponseHelper.success(PageDto<UserPoint>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/users')
  async getInscriptions(
    @Request() req,
    @Query() getUserPointDto: GetUserPointDto,
  ) {
    return this.pointService.getUserPoints(getUserPointDto);
  }
}
