import { Inject, Injectable, forwardRef } from '@nestjs/common';

import { PointRepository } from './point.repository';
import { UserService } from '@src/user/user.service';
import { SwapOffer } from '@src/swap-offer/swap-offer.entity';
import { Role, User } from '@src/user/user.entity';
import { Point } from './point.entity';
import { GetUserPointDto } from './dto/get-user-point.dto';
import { PageDto, PageMetaDto } from '@src/common/pagination/pagination.types';
import { MoreThan } from 'typeorm';
import { UserRepository } from '@src/user/user.repository';
import { GetUserPointsDto } from './dto/get-user-points.dto copy';

export type UserPoint = {
  amount: number;
  user: {
    name: string;
    role: Role;
    avatar: string | null;
    uuid: string;
  };
};

@Injectable()
export class PointService {
  constructor(
    private readonly pointReposintory: PointRepository,
    private readonly userRepository: UserRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}

  async addPoint(
    amount: number,
    user: User,
    swapOffer?: SwapOffer,
    description?: string,
  ): Promise<Point> {
    const pointEntity = this.pointReposintory.create({
      swapOffer,
      amount,
      user,
    });

    const savedPoint = await this.pointReposintory.save(pointEntity);

    return savedPoint;
  }

  async getUserPoints(
    getUserPointsDto: GetUserPointsDto,
  ): Promise<PageDto<UserPoint>> {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - getUserPointsDto.time);

    const userPointQuery = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'SUM(point.amount) as amount',
        'user.name as user_name',
        'user.role as user_role',
        'user.avatar as user_avatar',
        'user.uuid as user_uuid',
      ])
      .leftJoin('user.point', 'point')
      .groupBy('point.user_id')
      .addGroupBy('user.id')
      .orderBy('amount', 'DESC');

    if (getUserPointsDto.time !== -1)
      userPointQuery.where('point.updated_at > :time', { time: currentDate });

    userPointQuery
      .offset(
        getUserPointsDto.skip ??
          (getUserPointsDto.page - 1) * getUserPointsDto.take,
      )
      .limit(getUserPointsDto.take);

    const itemCount = await userPointQuery.getCount();
    const userPoints = await userPointQuery.getRawMany();

    const points: UserPoint[] = [];
    userPoints.forEach((point) => {
      points.push({
        amount: point.amount,
        user: {
          name: point.user_name,
          role: point.user_role,
          avatar: point.user_avatar,
          uuid: point.user_uuid,
        },
      });
    });

    const pageMetaDto = new PageMetaDto({
      itemCount,
      pageOptionsDto: getUserPointsDto,
    });

    return new PageDto(points, pageMetaDto);
  }

  async getUserPoint(
    userUuid: string,
    getUserPointDto: GetUserPointDto,
  ): Promise<{ point: number; position: number }> {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - getUserPointDto.time);

    let point;
    if (getUserPointDto.time === -1)
      point = await this.pointReposintory.sum('amount', {
        user: { uuid: userUuid },
      });
    else
      point = await this.pointReposintory.sum('amount', {
        user: { uuid: userUuid },
        updatedAt: MoreThan(currentDate),
      });

    const userPointQuery = await this.userRepository
      .createQueryBuilder('user')
      .select(['user_points.user_id as user_id'])
      .addFrom((subquery) => {
        subquery
          .select(['SUM(amount) as sum_value', 'point.user_id as user_id'])
          .from(Point, 'point')
          .groupBy('point.user_id')
          .orderBy('sum_value', 'DESC');

        if (getUserPointDto.time !== -1)
          subquery.where('point.updated_at > :time', { time: currentDate });

        return subquery;
      }, 'user_points')
      .where('user_points.user_id = user.id')
      .andWhere(`user_points.sum_value > ${point ?? 0}`);

    const itemCount = await userPointQuery.getCount();

    return { point: point ?? 0, position: itemCount + 1 };
  }
}
