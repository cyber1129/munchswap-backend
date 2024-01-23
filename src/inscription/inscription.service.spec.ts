import { Test, TestingModule } from '@nestjs/testing';
import { InscriptionService } from './inscription.service';

describe('InscriptionService', () => {
  let service: InscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InscriptionService],
    }).compile();

    service = module.get<InscriptionService>(InscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
