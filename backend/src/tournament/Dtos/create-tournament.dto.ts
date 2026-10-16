import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min, MaxLength } from 'class-validator';
import { CompetitionType, TournamentFormat, TournamentStatus } from '../../common/Tournament.enum';
import { Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DrawFormat } from '../../common/Draw.enum';
export class CreateTournamentDto
{
    @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 160 }) name: string;
  @Column({ length: 240 }) location: string;
  @Column({ type: 'timestamptz' }) startAt: Date;
  @Column({ type: 'enum', enum: TournamentFormat }) format: TournamentFormat;
//@Column({ type: 'enum', enum: CompetitionType, default: CompetitionType.DIRECT }) competitionType: CompetitionType;
//@Column({ type: 'enum', enum: DrawFormat, default: DrawFormat.ROUND_ROBIN }) drawFormat: DrawFormat;
//   @Column({ type: 'int', default: 80 }) confirmationThreshold: number;
//   @Column({ type: 'int', default: 2 }) playersPerTeam: number;
//   @Column({ type: 'int', default: 1 }) menPerTeam: number;
//   @Column({ type: 'int', default: 1 }) womenPerTeam: number;
  @Column({ type: 'enum', enum: TournamentStatus, default: TournamentStatus.DRAFT }) status: TournamentStatus;
  @Column({ type: 'uuid' }) organizerId: string;
  @Column({ type: 'boolean', default: false }) 
  @IsOptional()
  drawLocked?: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;

}