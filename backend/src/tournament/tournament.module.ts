import { Module } from '@nestjs/common';
import { TournamentController } from './tournament.controller';
import { TournamentService } from './tournament.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentMember } from './Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { Tournament } from './Entities/tounament.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, TournamentMember, User])],
  controllers: [TournamentController],
  providers: [TournamentService],
  exports: [TournamentService],
})
export class TournamentModule {}
