import { Test, TestingModule } from '@nestjs/testing';
import { InscriptionController } from './inscription.controller';

describe('InscriptionController', () => {
  let controller: InscriptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InscriptionController],
    }).compile();

    controller = module.get<InscriptionController>(InscriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
