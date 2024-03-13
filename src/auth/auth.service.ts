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

@Injectable()
export class AuthService {
  private network: string;

  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly signMessageRepository: SignMessageRepository,
    private readonly configService: ConfigService,
  ) {
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

    await this.generateSignMessage(body.address);

    try {
      const validity = Verifier.verifySignature(
        body.address,
        message,
        body.signature,
      );

      if (validity === false)
        throw new BadRequestException('The signature is invalid');
    } catch (error) {
      throw new BadRequestException('The signature is invalid');
    }

    // const user = await this.userService.findByAddress(body.address);
    // if (user && user.paymentPubkey !== null)
    //   return {
    //     address: user.address,
    //     uuid: user.uuid,
    //     role: user.role,
    //   };

    // let savedUser;

    // if (user) savedUser = await this.userService.create(body, true);
    // else savedUser = await this.userService.create(body);

    // return {
    //   address: savedUser.address,
    //   uuid: savedUser.uuid,
    //   role: savedUser.role,
    // };

    return null;
  }

  async createAccessToken(user: Partial<User>): Promise<string> {
    const payload: AccessTokenInterface = {
      address: 'user.address',
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
}
