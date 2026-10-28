import { Module } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentMember } from './Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { Tournament } from './Entities/tounament.entity';
import { DrawGateway } from '../draw/draw.gateway';
import { Match } from '../draw/Entities/match.entity';
import { Team } from '../draw/Entities/team.entity';
import { TournamentFormatDetail } from './Entities/tournament-format-detail.entity';
import { TournamentGroup } from '../draw/Entities/group.entity';
import { TeamMember } from '../draw/Entities/teamMember.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, TournamentMember, User, DrawGateway, Match, Team, TeamMember, TournamentGroup, TournamentFormatDetail])],
  controllers: [TournamentController],
  providers: [TournamentService, DrawGateway],
  exports: [TournamentService],
})
export class TournamentModule {}
