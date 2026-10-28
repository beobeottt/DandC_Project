import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tournament } from '../tournament/Entities/tounament.entity';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { PracticeSession } from './Entities/practice-session.entity';
import { PracticeService } from './practice.service';

describe('PracticeService', () => {
  let service: PracticeService;
  const sessionRepository = {
    create: jest.fn(value => value),
    save: jest.fn(async value => value),
  };
  const tournamentRepository = {
    findOne: jest.fn(),
  };
  const memberRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PracticeService,
        { provide: getRepositoryToken(PracticeSession), useValue: sessionRepository },
        { provide: getRepositoryToken(Tournament), useValue: tournamentRepository },
        { provide: getRepositoryToken(TournamentMember), useValue: memberRepository },
      ],
    }).compile();
    service = module.get<PracticeService>(PracticeService);
  });

  it('rejects success counts greater than attempts', async () => {
    tournamentRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      organizerId: 'organizer-1',
      approvalStatus: 'APPROVED',
    });
    memberRepository.findOne.mockResolvedValue({ id: 'member-1' });

    await expect(service.createSession('organizer-1', {
      tournamentId: 'tournament-1',
      playerId: 'player-1',
      focus: 'Serve practice',
      durationMinutes: 30,
      practiceDate: new Date().toISOString(),
      skillMetrics: [{ skill: 'SERVE', attempts: 5, successes: 6 }],
    })).rejects.toThrow('Số lần thành công phải nằm trong khoảng từ 0 đến số lần thực hiện');
    expect(sessionRepository.save).not.toHaveBeenCalled();
  });

  it('does not allow practice entry for a tournament that is not approved', async () => {
    tournamentRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      organizerId: 'organizer-1',
      approvalStatus: 'PENDING',
    });

    await expect(service.createSession('organizer-1', {
      tournamentId: 'tournament-1',
      playerId: 'player-1',
      focus: 'Serve practice',
      durationMinutes: 30,
      practiceDate: new Date().toISOString(),
      skillMetrics: [{ skill: 'SERVE', attempts: 5, successes: 3 }],
    })).rejects.toThrow('Chỉ có thể ghi practice trong giải đã được admin duyệt');
    expect(memberRepository.findOne).not.toHaveBeenCalled();
  });
});
