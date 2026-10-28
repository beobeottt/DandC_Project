import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('player_level_history')
export class PlayerLevelHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  playerId: string;

  @Column({ type: 'uuid' })
  adminId: string;

  @Column({ type: 'decimal', precision: 2, scale: 1 })
  previousLevel: number;

  @Column({ type: 'decimal', precision: 2, scale: 1 })
  newLevel: number;

  @Column({ type: 'varchar', length: 500 })
  reason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  changedAt: Date;
}
