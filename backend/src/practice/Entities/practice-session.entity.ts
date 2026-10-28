import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PickleballSkill } from '../../common/player-skill.enum';
import { Tournament } from '../../tournament/Entities/tounament.entity';
import { User } from '../../user/Entities/user.entity';

export interface PracticeSkillMetric {
  skill: PickleballSkill;
  attempts: number;
  successes: number;
}

@Entity('practice_sessions')
export class PracticeSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tournamentId: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'uuid' })
  organizerId: string;

  @Column({ type: 'varchar', length: 120 })
  focus: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string | null;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({ type: 'timestamptz' })
  practiceDate: Date;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  skillMetrics: PracticeSkillMetric[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Tournament, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playerId' })
  player: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizerId' })
  organizer: User;
}
