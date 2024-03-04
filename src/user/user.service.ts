import { Injectable, Logger } from '@nestjs/common';

import { LoginUserDto } from '@src/auth/dto/login-user.dto';
import { User } from './user.entity';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findByAddress(address: string): Promise<User> {
    return this.userRepository.findOne({ where: { address } });
  }

  async findByUuid(uuid: string): Promise<User> {
    return this.userRepository.findOne({ where: { uuid } });
  }

  async create(body: LoginUserDto, isUpdate?: boolean): Promise<User> {
    const userEntity: Partial<User> = {
      ...this.userRepository.create(body),
    };

    if (isUpdate === true)
    {  this.userRepository.update({ address: body.address }, userEntity);
    return this.findByAddress(body.address)
    }

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
