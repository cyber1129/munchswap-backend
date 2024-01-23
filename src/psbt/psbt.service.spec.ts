import { Test, TestingModule } from '@nestjs/testing';
import { PsbtService } from './psbt.service';

describe('PsbtService', () => {
  let service: PsbtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PsbtService],
    }).compile();

    service = module.get<PsbtService>(PsbtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
