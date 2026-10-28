import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './Entities/user.entity';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { Tournament } from '../tournament/Entities/tounament.entity';
import { TeamMember } from '../draw/Entities/teamMember.entity';
import { Match } from '../draw/Entities/match.entity';
import { Team } from '../draw/Entities/team.entity';
import { PlayerLevelHistory } from './Entities/player-level-history.entity';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        ...[User, TournamentMember, Tournament, TeamMember, Match, Team, PlayerLevelHistory].map(entity => ({
          provide: getRepositoryToken(entity),
          useValue: {},
        })),
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects invalid manual player levels', async () => {
    await expect(service.updatePlayerLevel('player-1', 'admin-1', {
      level: 6.2,
      reason: 'Recent match results',
    })).rejects.toThrow('Điểm trình phải từ 1.0 đến 6.0');
  });
});
