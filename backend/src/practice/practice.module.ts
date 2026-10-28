import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from '../tournament/Entities/tounament.entity';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { PracticeSession } from './Entities/practice-session.entity';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

@Module({
  imports: [TypeOrmModule.forFeature([PracticeSession, Tournament, TournamentMember])],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
