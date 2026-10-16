import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompetitionType, TournamentFormat, TournamentStatus } from '../../common/Tournament.enum';

@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column({ type: 'timestamptz' })
  startAt: Date;

  @Column({ type: 'enum', enum: TournamentFormat })
  format: TournamentFormat;

  @Column({
    type: 'enum',
    enum: CompetitionType,
    default: CompetitionType.DIRECT,
  })
  competition_Type: CompetitionType; // Tính điểm trực tiếp hoặc như luật cũ

  @Column({ default: 'ROUND_ROBIN' })
  bracket_Type: string; // hình thức thi đấu

  @Column({ type: 'int', default: 80 })
  confirmation_Threshold: number; // tỉ lệ người checkin giải đấu -> tiến hành phân đội

  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT,
  })
  status: TournamentStatus; // tình hình của giải đấu

  @Column({ type: 'uuid' })
  organizerId: string;

  @Column({type: 'boolean', default: false})
  drawLocked: boolean;

  @Column({type: 'int', default: 2})
  playersPerTeam: number;

  @Column({type: 'int', default: 1})
  menPerTeam: number;

  @Column({type: 'int', default: 1})
  womenPerTeam: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
