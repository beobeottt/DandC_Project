import { Test, TestingModule } from '@nestjs/testing';
import { TournamentService } from './tournament.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tournament } from './Entities/tounament.entity';
import { TournamentMember } from './Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { Match } from '../draw/Entities/match.entity';
import { Team } from '../draw/Entities/team.entity';
import { TournamentGroup } from '../draw/Entities/group.entity';
import { TeamMember } from '../draw/Entities/teamMember.entity';
import { DrawGateway } from '../draw/draw.gateway';
import { UserRole } from '../common/User.enum';
import { MatchStatus } from '../common/Match.enum';
import { TournamentAwardType, TournamentFormat } from '../common/Tournament.enum';
import { DrawFormat } from '../common/Draw.enum';

describe('TournamentService', () => {
  let service: TournamentService;
  const tournamentRepository = {
    create: jest.fn(value => value),
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  const matchRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(value => value),
    save: jest.fn(),
  };
  const membersRepository = {
    findOne: jest.fn(),
  };
  const groupsRepository = { find: jest.fn() };
  const teamsRepository = { find: jest.fn() };
  const drawGateway = {
    server: {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentService,
        { provide: getRepositoryToken(Tournament), useValue: tournamentRepository },
        { provide: getRepositoryToken(TournamentMember), useValue: membersRepository },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Match), useValue: matchRepository },
        { provide: getRepositoryToken(Team), useValue: teamsRepository },
        { provide: getRepositoryToken(TournamentGroup), useValue: groupsRepository },
        { provide: getRepositoryToken(TeamMember), useValue: {} },
        { provide: DrawGateway, useValue: drawGateway },
      ],
    }).compile();

    service = module.get<TournamentService>(TournamentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a tournament with the complete organizer details', async () => {
    tournamentRepository.save.mockImplementation(async tournament => tournament);

    const result = await service.create({
      name: 'Giải Pickleball',
      location: 'Sân trung tâm',
      startAt: '2026-11-01T08:00:00.000Z',
      endAt: '2026-11-02T18:00:00.000Z',
      description: 'Giải đấu mở rộng',
      coverImageUrl: '/uploads/tournaments/74e2bc13-3236-4e85-9d91-7a93d6eea25b.jpg',
      formatsDetail: [{ format: TournamentFormat.RRB_MEN_WOMEN, maxPlayers: 32 }],
      awardTypes: [TournamentAwardType.CUP, TournamentAwardType.CASH],
      feePerPlayer: 100000,
      championPrizeMoney: 5000000,
      contactLink: 'https://example.com/contact',
      drawFormat: DrawFormat.GROUP_AND_KNOCKOUT,
      qualifiersPerGroup: 3,
      bronzeMatchEnabled: true,
    }, 'organizer-1');

    expect(result).toMatchObject({
      name: 'Giải Pickleball',
      location: 'Sân trung tâm',
      endAt: new Date('2026-11-02T18:00:00.000Z'),
      awardTypes: [TournamentAwardType.CUP, TournamentAwardType.CASH],
      feePerPlayer: 100000,
      championPrizeMoney: 5000000,
      bracket_Type: DrawFormat.GROUP_AND_KNOCKOUT,
      qualifiersPerGroup: 3,
      bronzeMatchEnabled: true,
      organizerId: 'organizer-1',
    });
    expect(tournamentRepository.save).toHaveBeenCalled();
  });

  it('rejects a tournament whose end date is before its start date', async () => {
    await expect(service.create({
      name: 'Giải Pickleball',
      location: 'Sân trung tâm',
      startAt: '2026-11-02T08:00:00.000Z',
      endAt: '2026-11-01T18:00:00.000Z',
      formatsDetail: [{ format: TournamentFormat.MENDOUBLES, maxPlayers: 16 }],
    }, 'organizer-1')).rejects.toThrow('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
    expect(tournamentRepository.save).not.toHaveBeenCalled();
  });

  it('creates a knockout bracket when all group matches are completed', async () => {
    const groupMatch = {
      id: 'group-match-1',
      tournamentId: 'tournament-1',
      groupId: 'group-1',
      stage: 'GROUP',
      teamAId: 'team-1',
      teamBId: 'team-2',
      round: 1,
      matchNumber: 1,
      scoreA: 11,
      scoreB: 6,
      status: MatchStatus.IN_PROGRESS,
    };
    const tournament = {
      id: 'tournament-1',
      organizerId: 'organizer-1',
      bracket_Type: DrawFormat.GROUP_AND_KNOCKOUT,
      qualifiersPerGroup: 2,
      bronzeMatchEnabled: false,
    };
    matchRepository.findOne.mockResolvedValue(groupMatch);
    matchRepository.save.mockImplementation(async value => value);
    matchRepository.find.mockImplementation(async ({ where }) =>
      where.stage === 'GROUP' ? [{ ...groupMatch, status: MatchStatus.COMPLETED }] : [],
    );
    tournamentRepository.findOne.mockResolvedValue(tournament);
    groupsRepository.find.mockResolvedValue([{ id: 'group-1', position: 1 }]);
    teamsRepository.find.mockResolvedValue([
      { id: 'team-1', groupId: 'group-1' },
      { id: 'team-2', groupId: 'group-1' },
    ]);

    await service.updateMatchStatus(
      groupMatch.id,
      MatchStatus.COMPLETED,
      undefined,
      undefined,
      'organizer-1',
      UserRole.ORGANIZER,
    );

    expect(matchRepository.save).toHaveBeenLastCalledWith([
      expect.objectContaining({
        tournamentId: 'tournament-1',
        stage: 'KNOCKOUT',
        round: 1,
        teamAId: expect.any(String),
        teamBId: expect.any(String),
      }),
    ]);
  });

  it('creates a bronze medal match after both semifinals when the organizer enabled it', async () => {
    const semifinal = {
      id: 'semi-2',
      tournamentId: 'tournament-1',
      groupId: null,
      stage: 'KNOCKOUT',
      teamAId: 'team-3',
      teamBId: 'team-4',
      round: 1,
      matchNumber: 2,
      scoreA: 5,
      scoreB: 11,
      status: MatchStatus.IN_PROGRESS,
    };
    matchRepository.findOne.mockImplementation(async ({ where }) => {
      if (where.id === semifinal.id) return semifinal;
      if (where.stage === 'KNOCKOUT') return { id: 'final-1', round: 2, matchNumber: 1 };
      return null;
    });
    matchRepository.find.mockResolvedValue([
      { ...semifinal, status: MatchStatus.COMPLETED },
      { id: 'semi-1', stage: 'KNOCKOUT', round: 1, matchNumber: 1, status: MatchStatus.COMPLETED, teamAId: 'team-1', teamBId: 'team-2', scoreA: 11, scoreB: 6 },
      { id: 'final-1', stage: 'KNOCKOUT', round: 2, matchNumber: 1, status: MatchStatus.SCHEDULED },
    ]);
    matchRepository.save.mockImplementation(async value => value);
    tournamentRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      organizerId: 'organizer-1',
      bracket_Type: DrawFormat.GROUP_AND_KNOCKOUT,
      qualifiersPerGroup: 2,
      bronzeMatchEnabled: true,
    });

    await service.updateMatchStatus(
      semifinal.id,
      MatchStatus.COMPLETED,
      undefined,
      undefined,
      'organizer-1',
      UserRole.ORGANIZER,
    );

    expect(matchRepository.save).toHaveBeenLastCalledWith(expect.objectContaining({
      stage: 'BRONZE',
      round: 3,
      status: 'SCHEDULED',
    }));
    const bronzeMatch = matchRepository.save.mock.calls.at(-1)?.[0];
    expect([bronzeMatch.teamAId, bronzeMatch.teamBId]).toEqual(expect.arrayContaining(['team-2', 'team-3']));
  });

  it('returns distinct saved tournament locations as venue suggestions', async () => {
    tournamentRepository.find.mockResolvedValue([
      { location: 'Sân A' },
      { location: 'Sân A ' },
      { location: 'Sân B' },
      { location: '' },
    ]);

    await expect(service.listLocations()).resolves.toEqual(['Sân A', 'Sân B']);
  });

  it('does not allow an admin to update a match score without referee membership', async () => {
    const match = {
      id: 'match-1',
      tournamentId: 'tournament-1',
      status: MatchStatus.IN_PROGRESS,
      scoreA: 0,
      scoreB: 0,
    };
    matchRepository.findOne.mockResolvedValue(match);
    matchRepository.save.mockImplementation(async savedMatch => savedMatch);

    await expect(
      service.updateMatchScore('match-1', { scoreA: 4, scoreB: 2 }, 'admin-1', UserRole.ADMIN),
    ).rejects.toThrow('Bạn không có quyền điều khiển trận đấu');
    expect(membersRepository.findOne).toHaveBeenCalled();
  });

  it('records admin approval for a pending tournament', async () => {
    const tournament = {
      id: 'tournament-1',
      approvalStatus: 'PENDING',
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
    };
    tournamentRepository.findOne.mockResolvedValue(tournament);
    tournamentRepository.save.mockImplementation(async savedTournament => savedTournament);

    const result = await service.decideTournamentApproval('tournament-1', 'admin-1', {
      status: 'APPROVED',
    });

    expect(result.approvalStatus).toBe('APPROVED');
    expect(result.approvedBy).toBe('admin-1');
    expect(result.approvedAt).toBeInstanceOf(Date);
    expect(result.rejectionReason).toBeNull();
  });

  it('requires a reason when admin rejects a tournament', async () => {
    tournamentRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      approvalStatus: 'PENDING',
    });

    await expect(
      service.decideTournamentApproval('tournament-1', 'admin-1', { status: 'REJECTED' }),
    ).rejects.toThrow('Cần nhập lý do từ chối giải đấu');
    expect(tournamentRepository.save).not.toHaveBeenCalled();
  });
});
