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

import { Role } from '@src/auth/role/role.decorator';
import { PageDto, PageOptionsDto } from '@src/common/pagination/pagination.types';
import { JwtAuthGuard } from '@src/auth/guards/jwt-auth.guard';
import { RoleGuard } from '@src/auth/role/role.guard';
import { FriendRequestDto } from './dto/friend-request.dto';
import { FriendService } from './friend.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { SendFriendRequest } from './friend.type';
import { Friend } from './friend.entity';

@Controller('friend')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Send friend request`,
    tags: ['Friend'],
  })
  @ApiResponse(ApiResponseHelper.success(SendFriendRequest, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/send')
  async sendFriendRequest(
    @Request() req,
    @Body() body: FriendRequestDto,
  ): Promise<SendFriendRequest> {
    return this.friendService.sendFriendRequest(
      req.user.address,
      body.userAddress,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Ignore friend request`,
    tags: ['Friend'],
  })
  @ApiResponse(ApiResponseHelper.success(SendFriendRequest, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/send')
  @Post('/ignore')
  async ignoreFriendRequest(
    @Request() req,
    @Body() body: FriendRequestDto,
  ): Promise<SendFriendRequest> {
    return this.friendService.ignoreFriendRequest(
      body.userAddress,
      req.user.address,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Unblock an user`,
    tags: ['Friend'],
  })
  @ApiResponse(ApiResponseHelper.success(SendFriendRequest, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/unblock')
  async unblockFriendRequest(
    @Request() req,
    @Body() body: FriendRequestDto,
  ): Promise<SendFriendRequest> {
    return this.friendService.unblockFriendRequest(
      body.userAddress,
      req.user.address,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Block an user`,
    tags: ['Friend'],
  })
  @ApiResponse(ApiResponseHelper.success(SendFriendRequest, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/block')
  async blockFriendRequest(
    @Request() req,
    @Body() body: FriendRequestDto,
  ): Promise<SendFriendRequest> {
    return this.friendService.blockFriendRequest(
      body.userAddress,
      req.user.address,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Get paginated friends list`,
    tags: ['Friend'],
  })
  @ApiResponse(ApiResponseHelper.success(PageDto<Friend>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/')
  async getFriend(@Request() req, @Query() pageOptionsDto: PageOptionsDto) {
    return this.friendService.getFriends(req.user.address, pageOptionsDto);
  }
}
