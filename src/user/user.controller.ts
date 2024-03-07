import {
  Controller,
  forwardRef,
  Inject,
  Get,
  UseGuards,
  HttpStatus,
  Request,
} from '@nestjs/common';

import { AuthService } from '@src/auth/auth.service';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@src/auth/guards/jwt-auth.guard';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { User } from './user.entity';
import { Role } from '@src/auth/role/role.decorator';
import { RoleGuard } from '@src/auth/role/role.guard';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Get user info`, tags: ['User'] })
  @ApiResponse(ApiResponseHelper.success(User, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/user-info')
  async getUserPushedOffers(@Request() req) {
    return this.userService.findByAddress(req.user.address);
  }

  @ApiBearerAuth()
  @Role('Admin')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @ApiOperation({ description: `Get registered user count`, tags: ['User'] })
  @ApiResponse(ApiResponseHelper.success(User, HttpStatus.OK))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Get('/user-count')
  async getUserCount() {
    return this.userService.getRegisteredUserCount();
  }
}
