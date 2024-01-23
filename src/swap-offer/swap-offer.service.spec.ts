import { Test, TestingModule } from '@nestjs/testing';
import { SwapOfferService } from './swap-offer.service';

describe('SwapOfferService', () => {
  let service: SwapOfferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SwapOfferService],
    }).compile();

    service = module.get<SwapOfferService>(SwapOfferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
