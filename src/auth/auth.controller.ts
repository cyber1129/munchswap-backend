import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthService } from '@src/auth/auth.service';
import { ApiResponseHelper } from '@src/common/helpers/api-response.helper';
import { LoginUserDto } from './dto/login-user.dto';
import { GetSignMessageDto } from './dto/get-sign-message.dto';
import { AccessToken, GenerateMessage } from './auth.type';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: `Add wallet`, tags: ['Auth'] })
  @ApiResponse(ApiResponseHelper.success(AccessToken, HttpStatus.CREATED))
  @ApiResponse(ApiResponseHelper.validationError(`Validation failed`))
  @Post('/add-wallet')
  async addWallet(
    @Body() body: LoginUserDto,
    @Request() req,
  ): Promise<AccessToken> {
    const accessToken = await this.authService.addWallet(body, req.user.uuod);
    return { accessToken };
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
