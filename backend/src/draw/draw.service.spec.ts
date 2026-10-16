import { Test, TestingModule } from '@nestjs/testing';
import { DrawService } from './draw.service';

describe('DrawService', () => {
  let service: DrawService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DrawService],
    }).compile();

    service = module.get<DrawService>(DrawService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
