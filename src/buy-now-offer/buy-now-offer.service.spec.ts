import { Test, TestingModule } from '@nestjs/testing';
import { BuyNowOfferService } from './buy-now-offer.service';

describe('BuyNowOfferService', () => {
  let service: BuyNowOfferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BuyNowOfferService],
    }).compile();

    service = module.get<BuyNowOfferService>(BuyNowOfferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
