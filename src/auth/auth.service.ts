import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { generateSlug } from 'random-word-slugs';
import { Verifier } from 'bip322-js';

import { User } from '@src/user/user.entity';
import { UserService } from '@src/user/user.service';
import { AccessTokenInterface } from './auth.type';
import { LoginUserDto } from './dto/login-user.dto';
import { SignMessageRepository } from './sign-message.repository';
import { ConfigService } from '@nestjs/config';
import { WalletService } from '@src/wallet/wallet.service';

@Injectable()
export class AuthService {
  private network: string;

  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly signMessageRepository: SignMessageRepository,
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
  ) {
    this.network = this.configService.get('psbtConfig.network');
  }

  async login(user: AccessTokenInterface) {
    const accessToken = await this.createAccessToken(user);

    return {
      accessToken,
    };
  }

  async validateSignature(
    address: string,
    signature: string,
  ): Promise<boolean> {
    if (this.network === 'mainnet' && !address.startsWith('bc1p'))
      throw new BadRequestException('Wrong network');
    if (this.network !== 'mainnet' && !address.startsWith('tb1p'))
      throw new BadRequestException('Wrong network');

    const message = await this.getSignMessage(address);

    await this.generateSignMessage(address);

    try {
      const validity = Verifier.verifySignature(address, message, signature);

      return validity;
    } catch (error) {
      throw new BadRequestException('The signature is invalid');
    }
  }

  async validateUser(body: LoginUserDto): Promise<AccessTokenInterface | null> {
    const validity = await this.validateSignature(body.address, body.signature);

    if (validity === false)
      throw new BadRequestException('The signature is invalid');

    const user = await this.userService.findByAddress(body.address);
    if (user)
      return {
        address: body.address,
        uuid: user.uuid,
        role: user.role,
      };

    const savedUser = await this.userService.create(body);

    return {
      address: body.address,
      uuid: savedUser.uuid,
      role: savedUser.role,
    };
  }

  async createAccessToken(user: AccessTokenInterface): Promise<string> {
    const payload: AccessTokenInterface = {
      address: user.address,
      uuid: user.uuid,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }

  async getUser(uuid: string): Promise<User> {
    return this.userService.findByUuid(uuid);
  }

  async generateSignMessage(address: string): Promise<{ message: string }> {
    const signMessage = await this.signMessageRepository.findOne({
      where: { address },
    });
    const message = generateSlug(5);

    if (!signMessage)
      await this.signMessageRepository.save({ address, message });
    else await this.signMessageRepository.update({ address }, { message });

    return { message };
  }

  async getSignMessage(address: string): Promise<string> {
    const signMessage = await this.signMessageRepository.findOne({
      where: { address },
    });
    if (!signMessage)
      throw new BadRequestException('Can not find sign message');

    return signMessage.message;
  }

  async addWallet(
    body: LoginUserDto,
    uuid: string | undefined,
  ): Promise<string> {
    const validity = await this.validateSignature(body.address, body.signature);

    if (validity === false)
      throw new BadRequestException('The signature is invalid');

    const user = await this.userService.findByUuid(uuid);

    if (!user) throw new BadRequestException('Can not find registered user');

    await this.userService.addWallet(body, user);

    const accessToken: AccessTokenInterface = {
      address: body.address,
      role: user.role,
      uuid: user.uuid
    }

    return this.createAccessToken(accessToken)
  }
}
