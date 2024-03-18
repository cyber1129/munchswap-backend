import { Injectable } from '@nestjs/common';

import { PointRepository } from './point.repository';
import { UserService } from '@src/user/user.service';
import { SwapOffer } from '@src/swap-offer/swap-offer.entity';
import { User } from '@src/user/user.entity';
import { Point } from './point.entity';

export type Time = 7 | 1 | -1;

@Injectable()
export class PointService {
  constructor(
    private readonly pointReposintory: PointRepository,
    private readonly userService: UserService,
  ) {
    this.getUserPoints(7);
  }

  async addPoint(
    amount: number,
    user: User,
    swapOffer: SwapOffer,
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

  async getUserPoints(time: Time): Promise<void> {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - time);

    const userPoints = await this.pointReposintory
      .createQueryBuilder('point')
      .select(['SUM(amount) as amount'])
      .leftJoinAndSelect('point.user', 'user')
      .where('point.updated_at > :time', { time: currentDate })
      .groupBy('point.user_id')
      .addGroupBy('user.id')
      .orderBy('amount', 'DESC')
      .getRawAndEntities();

    console.log('userPoints', userPoints);
  }
}
