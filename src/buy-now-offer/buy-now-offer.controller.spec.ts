import { Test, TestingModule } from '@nestjs/testing';
import { BuyNowOfferController } from './buy-now-offer.controller';

describe('BuyNowOfferController', () => {
  let controller: BuyNowOfferController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuyNowOfferController],
    }).compile();

    controller = module.get<BuyNowOfferController>(BuyNowOfferController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
