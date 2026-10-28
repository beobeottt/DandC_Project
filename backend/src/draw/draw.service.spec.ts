import { Test, TestingModule } from '@nestjs/testing';
import { DrawService } from './draw.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Team } from './Entities/team.entity';
import { TournamentGroup } from './Entities/group.entity';
import { Tournament } from '../tournament/Entities/tounament.entity';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { TeamMember } from './Entities/teamMember.entity';
import { Match } from './Entities/match.entity';
import { DrawGateway } from './draw.gateway';

describe('DrawService', () => {
  let service: DrawService;
  const teamRepository = { find: jest.fn(), findOne: jest.fn() };
  const groupRepository = { find: jest.fn() };
  const tournamentRepository = { findOne: jest.fn() };
  const tournamentMemberRepository = { find: jest.fn() };
  const userRepository = { find: jest.fn() };
  const teamMemberRepository = { find: jest.fn() };
  const matchRepository = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrawService,
        { provide: getRepositoryToken(Team), useValue: teamRepository },
        { provide: getRepositoryToken(TournamentGroup), useValue: groupRepository },
        { provide: getRepositoryToken(Tournament), useValue: tournamentRepository },
        { provide: getRepositoryToken(TournamentMember), useValue: tournamentMemberRepository },
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: getRepositoryToken(TeamMember), useValue: teamMemberRepository },
        { provide: getRepositoryToken(Match), useValue: matchRepository },
        { provide: DrawGateway, useValue: {} },
      ],
    }).compile();

    service = module.get<DrawService>(DrawService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('ranks the final winner first, runner-up second, and bronze match winner third', async () => {
    tournamentRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      name: 'Giải Pickleball',
      bracket_Type: 'GROUP_AND_KNOCKOUT',
      bronzeMatchEnabled: true,
      drawLocked: true,
    });
    groupRepository.find.mockResolvedValue([]);
    teamRepository.find.mockResolvedValue([
      { id: 'team-1', name: 'Đội 1' },
      { id: 'team-2', name: 'Đội 2' },
      { id: 'team-3', name: 'Đội 3' },
      { id: 'team-4', name: 'Đội 4' },
    ]);
    matchRepository.find.mockResolvedValue([
      { id: 'semi-1', stage: 'KNOCKOUT', round: 1, teamAId: 'team-1', teamBId: 'team-2', scoreA: 11, scoreB: 6, status: 'COMPLETED' },
      { id: 'semi-2', stage: 'KNOCKOUT', round: 1, teamAId: 'team-3', teamBId: 'team-4', scoreA: 5, scoreB: 11, status: 'COMPLETED' },
      { id: 'final', stage: 'KNOCKOUT', round: 2, teamAId: 'team-1', teamBId: 'team-4', scoreA: 11, scoreB: 9, status: 'COMPLETED' },
      { id: 'bronze', stage: 'BRONZE', round: 3, teamAId: 'team-2', teamBId: 'team-3', scoreA: 8, scoreB: 11, status: 'COMPLETED' },
    ]);
    teamMemberRepository.find.mockResolvedValue([]);

    await expect(service.getOverallResults('tournament-1')).resolves.toMatchObject({
      podium: {
        first: 'Đội 1',
        second: 'Đội 4',
        third: ['Đội 3'],
        thirdPlacePending: false,
      },
    });
  });

  it('returns both semifinal losers as tied third place without a bronze match', async () => {
    tournamentRepository.findOne.mockResolvedValue({
      id: 'tournament-1',
      name: 'Giải Pickleball',
      bracket_Type: 'GROUP_AND_KNOCKOUT',
      bronzeMatchEnabled: false,
      drawLocked: true,
    });
    groupRepository.find.mockResolvedValue([]);
    teamRepository.find.mockResolvedValue([
      { id: 'team-1', name: 'Đội 1' },
      { id: 'team-2', name: 'Đội 2' },
      { id: 'team-3', name: 'Đội 3' },
      { id: 'team-4', name: 'Đội 4' },
    ]);
    matchRepository.find.mockResolvedValue([
      { id: 'semi-1', stage: 'KNOCKOUT', round: 1, teamAId: 'team-1', teamBId: 'team-2', scoreA: 11, scoreB: 6, status: 'COMPLETED' },
      { id: 'semi-2', stage: 'KNOCKOUT', round: 1, teamAId: 'team-3', teamBId: 'team-4', scoreA: 5, scoreB: 11, status: 'COMPLETED' },
      { id: 'final', stage: 'KNOCKOUT', round: 2, teamAId: 'team-1', teamBId: 'team-4', scoreA: 11, scoreB: 9, status: 'COMPLETED' },
    ]);
    teamMemberRepository.find.mockResolvedValue([]);

    await expect(service.getOverallResults('tournament-1')).resolves.toMatchObject({
      podium: {
        first: 'Đội 1',
        second: 'Đội 4',
        third: ['Đội 2', 'Đội 3'],
        thirdPlacePending: false,
      },
    });
  });
});
