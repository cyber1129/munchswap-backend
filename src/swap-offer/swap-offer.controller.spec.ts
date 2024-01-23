import { Test, TestingModule } from '@nestjs/testing';
import { SwapOfferController } from './swap-offer.controller';

describe('SwapOfferController', () => {
  let controller: SwapOfferController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SwapOfferController],
    }).compile();

    controller = module.get<SwapOfferController>(SwapOfferController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
