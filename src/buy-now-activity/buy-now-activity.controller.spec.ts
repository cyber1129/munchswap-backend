import { Test, TestingModule } from '@nestjs/testing';
import { BuyNowActivityController } from './buy-now-activity.controller';

describe('BuyNowActivityController', () => {
  let controller: BuyNowActivityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuyNowActivityController],
    }).compile();

    controller = module.get<BuyNowActivityController>(BuyNowActivityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
