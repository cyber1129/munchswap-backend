import { Injectable, Logger } from '@nestjs/common';

import { LoginUserDto } from '@src/auth/dto/login-user.dto';
import { User } from './user.entity';
import { UserRepository } from './user.repository';
import { Not } from 'typeorm';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findByAddress(address: string): Promise<User> {
    return this.userRepository.findOne({ where: { wallet: { address } } });
  }

  async findByUuid(uuid: string): Promise<User> {
    return this.userRepository.findOne({ where: { uuid } });
  }

  async create(body: LoginUserDto, isUpdate?: boolean): Promise<User> {
    const userEntity: Partial<User> = {
      ...this.userRepository.create({}),
    };

    if (isUpdate === true) {
      this.userRepository.update({}, userEntity);
      return this.findByAddress(body.address);
    }

    const user = await this.userRepository.save(userEntity, { reload: false });

    return this.findByUuid(user.uuid);
  }

  // async createWithAddress(address: string): Promise<User> {
  //   const userEntity: Partial<User> = {
  //     address,
  //   };

  //   const user = await this.userRepository.save(userEntity, { reload: false });

  //   return this.findByUuid(user.uuid);
  // }

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async getRegisteredUserCount(): Promise<Number> {
    const count = await this.userRepository.count({
      where: {
        wallet: { paymentPubkey: Not('') },
      },
    });

    return count;
  }
}
