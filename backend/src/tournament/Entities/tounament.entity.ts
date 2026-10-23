import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CompetitionType, TournamentStatus } from '../../common/Tournament.enum';
import { TournamentFormatDetail } from './tournament-format-detail.entity';

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

  @Column({
    type: 'enum',
    enum: CompetitionType,
    default: CompetitionType.DIRECT,
  })
  competition_Type: CompetitionType;

  @Column({ default: 'ROUND_ROBIN' })
  bracket_Type: string;

  @Column({ type: 'int', default: 80 })
  confirmation_Threshold: number;

  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT,
  })
  status: TournamentStatus;

  @Column({ type: 'uuid' })
  organizerId: string;

  @Column({ type: 'boolean', default: false })
  drawLocked: boolean;

  // Quan hệ 1-Nhiều: Một giải đấu có thể có nhiều nội dung thi đấu kèm cấu hình riêng
  @OneToMany(() => TournamentFormatDetail, (detail) => detail.tournament, {
    cascade: true, // Khi tạo Tournament, tự động lưu luôn các format detail đi kèm
    eager: true,   // Tự động load luôn chi tiết format khi gọi findOne/find
  })
  formatDetails: TournamentFormatDetail[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
