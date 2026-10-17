import { Module } from '@nestjs/common';
import { DrawController } from './draw.controller';
import { DrawService } from './draw.service';
import { DrawGateway } from './draw.gateway';
import { TeamMember } from './Entities/teamMember.entity';
import { User } from '../user/Entities/user.entity';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { Tournament } from '../tournament/Entities/tounament.entity';
import { TournamentGroup } from './Entities/group.entity';
import { Team } from './Entities/team.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './Entities/match.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      TournamentGroup,
      Tournament,
      TournamentMember,
      User,
      TeamMember,
      Match,
    ]),
  ],
  controllers: [DrawController],
  providers: [DrawService, DrawGateway],
})
export class DrawModule {}
