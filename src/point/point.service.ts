import { Injectable } from '@nestjs/common';

import { PointRepository } from './point.repository';

@Injectable()
export class PointService {
  constructor(private readonly pointReposintory: PointRepository) {}
}
