import { Module } from '@nestjs/common';
import { PointService } from './point.service';
import { PointController } from './point.controller';
import { PointRepository } from './point.repository';
import { UserModule } from '@src/user/user.module';
import { UserService } from '@src/user/user.service';

@Module({
  imports: [UserModule],
  providers: [PointService, PointRepository, UserService],
  controllers: [PointController],
  exports: [PointService, PointRepository],
})
export class PointModule {}
