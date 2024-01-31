import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthService } from '@src/auth/auth.service';
import { User } from '@src/user/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginUserDto } from './dto/login-user.dto';
import { GetSignMessageDto } from './dto/get-sign-message.dto';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { AccessToken, GenerateMessage } from './auth.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ description: `User login`, tags: ['Auth'] })
  @ApiResponse(ApiResponseHelper.success(AccessToken, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/login')
  async login(@Body() body: LoginUserDto): Promise<AccessToken> {
    const user = await this.authService.validateUser(body);
    const authData = await this.authService.login(user);
    return { accessToken: authData.accessToken };
  }

  @ApiOperation({
    description: `Generate sign message for bip 322 verification `,
    tags: ['Auth'],
  })
  @ApiResponse(ApiResponseHelper.success(GenerateMessage, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/generate-message')
  async generateSignMessage(
    @Body() body: GetSignMessageDto,
  ): Promise<GenerateMessage> {
    return this.authService.generateSignMessage(body.address);
  }
}
