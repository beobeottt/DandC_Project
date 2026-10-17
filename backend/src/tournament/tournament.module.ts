import { Module } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentMember } from './Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { Tournament } from './Entities/tounament.entity';
import { DrawGateway } from '../draw/draw.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, TournamentMember, User, DrawGateway])],
  controllers: [TournamentController],
  providers: [TournamentService, DrawGateway],
  exports: [TournamentService],
})
export class TournamentModule {}
