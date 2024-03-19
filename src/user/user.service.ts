import { BadRequestException, Injectable, forwardRef } from '@nestjs/common';

import { LoginUserDto } from '@src/auth/dto/login-user.dto';
import { User } from './user.entity';
import { UserRepository } from './user.repository';
import { Not } from 'typeorm';
import { Wallet } from '@src/wallet/wallet.entity';
import { WalletService } from '@src/wallet/wallet.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly walletService: WalletService,
  ) {}

  async findByAddress(address: string): Promise<User> {
    return this.userRepository.findOne({
      where: { wallet: { address } },
      relations: { wallet: true },
    });
  }

  async findByUuid(uuid: string): Promise<User> {
    return this.userRepository.findOne({
      where: { uuid },
      relations: { wallet: true },
    });
  }

  async create(body: LoginUserDto, isUpdate?: boolean): Promise<User> {
    const userEntity: Partial<User> = {
      ...this.userRepository.create({ name: body.address }),
    };

    if (isUpdate === true) {
      this.userRepository.update({}, userEntity);
      return this.findByAddress(body.address);
    }

    const user = await this.userRepository.save(userEntity, { reload: true });

    const wallet = await this.walletService.findByAddress(body.address);

    const walletEntity: Partial<Wallet> = {
      address: body.address,
      pubkey: body.pubkey,
      walletType: body.walletType,
      paymentAddress: body.paymentAddress,
      paymentPubkey: body.paymentPubkey,
      user,
    };

    if (wallet) {
      await this.walletService.updateWallet(walletEntity, wallet.id);
    } else {
      await this.walletService.createWallet(walletEntity);
    }
    return this.findByUuid(user.uuid);
  }

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async getRegisteredUserCount(): Promise<number> {
    const count = await this.userRepository.count({
      where: {
        wallet: { paymentPubkey: Not('') },
      },
    });

    return count;
  }

  async addWallet(body: LoginUserDto, user: User | undefined): Promise<Wallet> {
    const registeredWallet = await this.walletService.findByAddress(
      body.address,
    );

    if (registeredWallet)
      throw new BadRequestException('The wallet address is already registered');

    const wallet: Partial<Wallet> = {
      address: body.address,
      pubkey: body.pubkey,
      walletType: body.walletType,
      paymentAddress: body.paymentAddress,
      paymentPubkey: body.paymentPubkey,
      user,
    };

    return this.walletService.createWallet(wallet);
  }

  async updateUserInfo(body: UpdateUserDto, userId: string): Promise<User> {
    const user = await this.findByUuid(userId);

    if (user) {
      await this.userRepository.update({ uuid: userId }, { ...body });
      return this.findByUuid(userId);
    }

    throw new BadRequestException("Can not find the user")
  }
}
