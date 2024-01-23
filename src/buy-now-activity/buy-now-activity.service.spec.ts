import { Test, TestingModule } from '@nestjs/testing';
import { BuyNowActivityService } from './buy-now-activity.service';

describe('BuyNowActivityService', () => {
  let service: BuyNowActivityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BuyNowActivityService],
    }).compile();

    service = module.get<BuyNowActivityService>(BuyNowActivityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
