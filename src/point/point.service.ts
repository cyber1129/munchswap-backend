import { Inject, Injectable, forwardRef } from '@nestjs/common';

import { PointRepository } from './point.repository';
import { UserService } from '@src/user/user.service';
import { SwapOffer } from '@src/swap-offer/swap-offer.entity';
import { Role, User } from '@src/user/user.entity';
import { Point } from './point.entity';
import { GetUserPointDto } from './dto/get-user-point.dto';
import { PageDto, PageMetaDto } from '@src/common/pagination/pagination.types';

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
    getUserPointDto: GetUserPointDto,
  ): Promise<PageDto<UserPoint>> {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - getUserPointDto.time);

    const userPointQuery = await this.pointReposintory
      .createQueryBuilder('point')
      .select(['SUM(amount) as amount'])
      .leftJoinAndSelect('point.user', 'user')
      .groupBy('point.user_id')
      .addGroupBy('user.id')
      .orderBy('amount', 'DESC');

    if (getUserPointDto.time !== -1)
      userPointQuery.where('point.updated_at > :time', { time: currentDate });

    userPointQuery
      .offset(
        getUserPointDto.skip ??
          (getUserPointDto.page - 1) * getUserPointDto.take,
      )
      .limit(getUserPointDto.take);

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
      pageOptionsDto: getUserPointDto,
    });

    return new PageDto(points, pageMetaDto);
  }

  async getUserPoint(userUuid: string): Promise<number> {
    const point = await this.pointReposintory.sum('amount', {
      user: { uuid: userUuid },
    });

    return point ?? 0;
  }
}
