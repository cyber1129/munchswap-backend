import { Injectable } from '@nestjs/common';

import { PointRepository } from './point.repository';
import { UserService } from '@src/user/user.service';
import { SwapOffer } from '@src/swap-offer/swap-offer.entity';
import { User } from '@src/user/user.entity';
import { Point } from './point.entity';

@Injectable()
export class PointService {
  constructor(
    private readonly pointReposintory: PointRepository,
    private readonly userService: UserService,
  ) {}

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
}
