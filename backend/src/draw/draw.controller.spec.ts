import { Test, TestingModule } from '@nestjs/testing';
import { DrawController } from './draw.controller';

describe('DrawController', () => {
  let controller: DrawController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DrawController],
    }).compile();

    controller = module.get<DrawController>(DrawController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
