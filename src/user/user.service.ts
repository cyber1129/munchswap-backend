import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosError } from 'axios';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection, Like } from 'typeorm';

import { LoginUserDto } from '@src/auth/dto/login-user.dto';
import { User } from './user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  private btcPrice: number;
  private logger: Logger;

  constructor(
    private readonly userRepository: UserRepository,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.btcPrice = 0;
    this.logger = new Logger(UserService.name);
  }

  async findByAddress(address: string): Promise<User> {
    return this.userRepository.findOne({ where: { address } });
  }

  async findByUuid(uuid: string): Promise<User> {
    return this.userRepository.findOne({ where: { uuid } });
  }

  async create(body: LoginUserDto): Promise<User> {
    const userEntity: Partial<User> = {
      ...this.userRepository.create(body),
    };

    const user = await this.userRepository.save(userEntity, { reload: false });

    return this.findByUuid(user.uuid);
  }

  async createWithAddress(address: string): Promise<User> {
    const userEntity: Partial<User> = {
      address,
    };

    const user = await this.userRepository.save(userEntity, { reload: false });

    return this.findByUuid(user.uuid);
  }

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async search(keyWord: string): Promise<Partial<User>[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(name) LIKE LOWER(:search)', {
        search: `%${keyWord}%`,
      })
      .orWhere('LOWER(address) LIKE LOWER(:search)', {
        search: `%${keyWord}%`,
      })
      .orderBy('updated_at', 'DESC')
      .getRawAndEntities();

    return users.entities.map((user) => {
      return {
        address: user.address,
      };
    });
  }
}
