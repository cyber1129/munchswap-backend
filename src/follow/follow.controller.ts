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

import {
  PageDto,
  PageOptionsDto,
} from '@src/common/pagination/pagination.types';
import { Role } from '@src/auth/role/role.decorator';
import { JwtAuthGuard } from '@src/auth/guards/jwt-auth.guard';
import { RoleGuard } from '@src/auth/role/role.guard';
import { FollowUserDto } from './dto/follow-user.dto';
import { FollowService } from './follow.service';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import {
  CheckUserFollowed,
  FollowCount,
  FollowUserResult,
  FollowerInfo,
  FollowingInfo,
} from './follow.type';

@Controller('follow')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Follow user`, tags: ['Follow'] })
  @ApiResponse(ApiResponseHelper.success(FollowUserResult, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/follow-user')
  async followUser(
    @Request() req,
    @Body() body: FollowUserDto,
  ): Promise<FollowUserResult> {
    await this.followService.followUser(
      req.user.address,
      body.followingAddress,
    );

    return {
      msg: 'You successfully followed',
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Unfollow user`, tags: ['Follow'] })
  @ApiResponse(ApiResponseHelper.success(FollowUserResult, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/unfollow-user')
  async unFollowUser(
    @Request() req,
    @Body() body: FollowUserDto,
  ): Promise<FollowUserResult> {
    await this.followService.unFollowUser(
      req.user.address,
      body.followingAddress,
    );

    return {
      msg: 'You successfully unfollowed',
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Check if user followed an user`,
    tags: ['Follow'],
  })
  @ApiResponse(ApiResponseHelper.success(CheckUserFollowed, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/check')
  async checkIfFollowed(
    @Request() req,
    @Query() body: FollowUserDto,
  ): Promise<CheckUserFollowed> {
    const ifFollowed = await this.followService.checkIfFollowed(
      req.user.address,
      body.followingAddress,
    );

    return {
      res: ifFollowed,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: `Get follower and following member counts`,
    tags: ['Follow'],
  })
  @ApiResponse(ApiResponseHelper.success(FollowCount, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/count')
  async getFollowCount(@Request() req): Promise<FollowCount> {
    const followerMemberCount = await this.followService.getFollowerMemberCount(
      req.user.address,
    );

    const followingMemberCount =
      await this.followService.getFollowingMemberCount(req.user.address);

    return {
      follower: followerMemberCount,
      following: followingMemberCount,
    };
  }

  @ApiOperation({
    description: `Get follower and following member counts by user address`,
    tags: ['Follow'],
  })
  @ApiResponse(ApiResponseHelper.success(FollowCount, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/count/:userAddress')
  async getFollowCountByAddress(
    @Param('userAddress') userAddress: string,
  ): Promise<{ follower: number; following: number }> {
    const followerMemberCount = await this.followService.getFollowerMemberCount(
      userAddress,
    );

    const followingMemberCount =
      await this.followService.getFollowingMemberCount(userAddress);

    return {
      follower: followerMemberCount,
      following: followingMemberCount,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Get follower members`, tags: ['Follow'] })
  @ApiResponse(ApiResponseHelper.success(PageDto<FollowerInfo>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/follower/:userAddress')
  async getFollowerMembers(
    @Param('userAddress') userAddress: string,
    @Request() req,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.followService.getFollowerMembers(
      req.user.address,
      userAddress,
      pageOptionsDto,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Get following members`, tags: ['Follow'] })
  @ApiResponse(ApiResponseHelper.success(PageDto<FollowingInfo>, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/following/:userAddress')
  async getFollowingMembers(
    @Param('userAddress') userAddress: string,
    @Request() req,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.followService.getFollowingMembers(
      req.user.address,
      userAddress,
      pageOptionsDto,
    );
  }
}
