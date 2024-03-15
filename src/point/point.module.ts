import { Module } from '@nestjs/common';
import { PointService } from './point.service';
import { PointController } from './point.controller';
import { PointRepository } from './point.repository';

@Module({
  providers: [PointService, PointRepository],
  controllers: [PointController]
})
export class PointModule {}
