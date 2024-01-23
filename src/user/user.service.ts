import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosError } from 'axios';
import { InjectConnection } from '@nestjs/typeorm';
import { Brackets, Connection, Like } from 'typeorm';

import { LoginUserDto } from '@src/auth/dto/login-user.dto';
import { PageDto, PageMetaDto } from '@src/common/pagination/pagination.types';
import { BuyNowActivity } from '@src/buy-now-activity/buy-now-activity.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
import { UserRepository } from './user.repository';
import { GetTopSellersPageDto } from './dto/get-top-sellers-page.dto';

@Injectable()
export class UserService {
  private btcPrice: number;
  private logger: Logger;

  constructor(
    private readonly userRepository: UserRepository,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.btcPrice = 0;
    this.fetchBtcPrice();
    this.logger = new Logger(UserService.name);
  }

  async findByAddress(address: string): Promise<User> {
    return this.userRepository.findOne({ where: { address } });
  }

  async findByUuid(uuid: string): Promise<User> {
    return this.userRepository.findOne({ where: { uuid } });
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByName(userName: string): Promise<User> {
    return this.userRepository.findOne({ where: { name: userName } });
  }

  async update(uuid: string, body: UpdateUserDto): Promise<User> {
    await this.userRepository.update(
      { uuid },
      this.userRepository.create({ ...body, isRegistered: true }),
    );

    return this.findByUuid(uuid);
  }

  async create(body: LoginUserDto): Promise<User> {
    const userEntity: Partial<User> = {
      ...this.userRepository.create(body),
    };

    const user = await this.userRepository.save(userEntity, { reload: false });

    return this.findByUuid(user.uuid);
  }

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async checkSignature(address, signature, bipMessage) {
    const data = {
      jsonrpc: '1.0',
      id: 'bip322',
      method: 'verifymessage',
      params: [address, signature, bipMessage],
    };

    const config = {
      headers: {
        'content-type': 'text/plain',
      },
      auth: {
        username: process.env.RPC_USERNAME,
        password: process.env.RPC_PASSWORD,
      },
    };

    try {
      const res = await axios.post(
        `https://${process.env.RPC_HOST}:${process.env.RPC_PORT}/`,
        data,
        config,
      );

      return res.data.result ? true : false;
    } catch (err) {
      return false;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async fetchBtcPrice(): Promise<void> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: 'bitcoin',
            vs_currencies: 'usd',
          },
        },
      );

      this.btcPrice = Number(response.data.bitcoin.usd);
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error('fetch btc price error', axiosErr.response?.data);
    }
  }

  getBtcPrice(): number {
    return this.btcPrice;
  }

  async getTotalSalesByUserId(userId: number[]): Promise<
    | {
        address: string;
        name: string;
        swap_sales: number;
        buy_now_sales: number;
      }[]
    | null
  > {
    const res = await this.connection.query(`
    SELECT 
      "user".address as address, 
      "user".name as name, 
      swap.swap_sales as swap_sales, 
      buy_now.buy_now_sales as buy_now_sales
      FROM
        "user"
      LEFT JOIN
            (SELECT SUM(swap_offer.price) as swap_sales, buy_now_activity.user_id 
            FROM swap_offer, buy_now_activity 
            WHERE swap_offer.buy_now_activity_id = buy_now_activity.id 
                AND swap_offer.deleted_at IS NULL 
                AND swap_offer.status = 'pushed' 
            GROUP BY buy_now_activity.user_id) as swap
      ON swap.user_id = "user".id
      LEFT JOIN
          (SELECT SUM(buy_now_offer.price) as buy_now_sales, buy_now_activity.user_id 
            FROM buy_now_offer, buy_now_activity 
            WHERE buy_now_offer.buy_now_activity_id = buy_now_activity.id 
                AND buy_now_offer.deleted_at IS NULL 
                AND buy_now_offer.status = 'pushed' 
            GROUP BY buy_now_activity.user_id) as buy_now
      ON buy_now.user_id = "user".id
      WHERE "user".is_registered = true
      AND "user".id in (${userId.join(',')})`);

    if ((res as any[]).length === 0) return null;

    return res;
  }

  async getTotalSales(userAddress: string): Promise<number> {
    const user = await this.findByAddress(userAddress);
    if (!user) throw new BadRequestException('Can not find the user');

    const totalSales = await this.getTotalSalesByUserId([user.id]);
    if (totalSales)
      return (
        Math.floor(
          (totalSales[0].swap_sales + totalSales[0].buy_now_sales) * 10 ** 8,
        ) /
        10 ** 8
      );
    return 0;
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
        name: user.name,
        address: user.address,
      };
    });
  }

  async getTopSellers(
    pageOptionsDto: GetTopSellersPageDto,
  ): Promise<PageDto<{ totalSales: number; address: string; name: string }>> {
    const now = new Date();
    now.setDate(now.getDate() - pageOptionsDto.time);

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .withDeleted()
      .select([
        'sales.total_sales as total_sales',
        'user.address as address',
        'user.name as name',
      ])
      .leftJoin(
        (subQuery) => {
          return subQuery
            .from(BuyNowActivity, 'buy_now_activity')
            .select(['SUM(buy_now_activity.price) as total_sales', 'user_id'])
            .where("buy_now_activity.status='completed'")
            .andWhere(`buy_now_activity.updated_at > :date`, { date: now })
            .orderBy('SUM(buy_now_activity.price)', 'DESC')
            .withDeleted()
            .groupBy('buy_now_activity.user_id');
        },
        'sales',
        'sales.user_id=user.id',
      )
      .where('user.is_registered=true')
      .offset(
        pageOptionsDto.skip ?? (pageOptionsDto.page - 1) * pageOptionsDto.take,
      )
      .limit(pageOptionsDto.take);

    if (pageOptionsDto.keyword) {
      queryBuilder.andWhere(
        new Brackets((subQuery) => {
          subQuery
            .where('user.address like :search', {
              search: `%${pageOptionsDto.keyword}%`,
            })
            .orWhere('user.name like :search', {
              search: `%${pageOptionsDto.keyword}%`,
            });
        }),
      );
    }

    const users = await queryBuilder.getRawMany();
    const itemCount = await queryBuilder.getCount();

    const pageMetaDto = new PageMetaDto({ itemCount, pageOptionsDto });
    const entities = users.map((user) => {
      return {
        address: user.address,
        totalSales: Math.floor(user.total_sales * 10 ** 8) / 10 ** 8,
        name: user.name,
      };
    });
    return new PageDto(entities, pageMetaDto);
  }
}
