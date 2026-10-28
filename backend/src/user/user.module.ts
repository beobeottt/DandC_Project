import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './Entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { Tournament } from '../tournament/Entities/tounament.entity';
import { JwtService } from '@nestjs/jwt';
import { TeamMember } from '../draw/Entities/teamMember.entity';
import { Match } from '../draw/Entities/match.entity';
import { Team } from '../draw/Entities/team.entity';
import { PlayerLevelHistory } from './Entities/player-level-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, TournamentMember, Tournament, TeamMember, Match, Team, PlayerLevelHistory])],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
