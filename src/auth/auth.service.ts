import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { generateSlug } from 'random-word-slugs';
import { Verifier } from 'bip322-js';

import { User } from '@src/user/user.entity';
import { UserService } from '@src/user/user.service';
import { AccessTokenInterface } from './auth.type';
import { LoginUserDto } from './dto/login-user.dto';
import { SignMessageRepository } from './sign-message.repository';

@Injectable()
export class AuthService {
  private rpcUserName: string;
  private rpcHost: string;
  private rpcPassword: string;
  private rpcPort: number;
  private network: string;

  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly signMessageRepository: SignMessageRepository,
    private readonly configService: ConfigService,
  ) {
    this.rpcUserName = this.configService.get('rpcConfig.rpcUserName');
    this.rpcHost = this.configService.get('rpcConfig.rpcHost');
    this.rpcPassword = this.configService.get('rpcConfig.rpcPassword');
    this.rpcPort = this.configService.get('rpcConfig.rpcPort');
    this.network = this.configService.get('psbtConfig.network');
  }

  async login(user: Partial<User>) {
    const accessToken = await this.createAccessToken(user);

    return {
      accessToken,
    };
  }

  async validateUser(body: LoginUserDto): Promise<Partial<User> | null> {
    if (this.network === 'mainnet' && !body.address.startsWith('bc1p'))
      throw new BadRequestException('Wrong network');
    if (this.network !== 'mainnet' && !body.address.startsWith('tb1p'))
      throw new BadRequestException('Wrong network');

    const message = await this.getSignMessage(body.address);

    await this.generateSignMessage(body.address)

    if (this.network === 'mainnet') {
      const validity = Verifier.verifySignature(body.address, message, body.signature);

      if (validity === false)
        throw new BadRequestException('The signature is invalid');
    }

    const user = await this.userService.findByAddress(body.address);
    if (user)
      return {
        address: user.address,
        uuid: user.uuid,
        role: user.role,
        isRegistered: user.isRegistered,
      };
    const savedUser = await this.userService.create(body);

    return {
      address: savedUser.address,
      uuid: savedUser.uuid,
      role: savedUser.role,
      isRegistered: savedUser.isRegistered,
    };
  }

  async createAccessToken(user: Partial<User>): Promise<string> {
    const payload: AccessTokenInterface = {
      address: user.address,
      uuid: user.uuid,
      role: user.role,
      isRegistered: user.isRegistered,
    };

    return this.jwtService.signAsync(payload);
  }

  async getUser(uuid: string): Promise<User> {
    return this.userService.findByUuid(uuid);
  }

  async getUserByName(userName: string): Promise<User> {
    const user = await this.userService.findByName(userName);
    if (!user) throw new BadRequestException('Can not find user info');

    return user;
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

  async checkBip322Signature(
    address: string,
    signature: string,
    bipMessage,
  ): Promise<boolean> {
    const data = {
      jsonrpc: '1.0',
      id: 'curltest',
      method: 'verifymessage',
      params: [address, signature, bipMessage],
    };
    const config = {
      headers: {
        'content-type': 'text/plain',
      },
      auth: {
        username: this.rpcUserName,
        password: this.rpcPassword,
      },
    };

    try {
      const res = await axios.post(
        `https://${this.rpcHost}:${this.rpcPort}/`,
        data,
        config,
      );

      return res.data.result;
    } catch (err) {

      return false;
    }
  }
}
