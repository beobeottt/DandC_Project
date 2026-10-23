import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { TournamentFormat } from '../../common/Tournament.enum';
import { Tournament } from './tounament.entity';


@Entity('tournament_format_details')
export class TournamentFormatDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TournamentFormat })
  format: TournamentFormat;

  @Column({ type: 'int', default: 16 })
  maxPlayers: number; // Số lượng người chơi/đội cho riêng nội dung này

  @Column({ type: 'int', nullable: true })
  menPerTeam?: number; // Số nam mỗi đội (Dành riêng cho MLP)

  @Column({ type: 'int', nullable: true })
  womenPerTeam?: number; // Số nữ mỗi đội (Dành riêng cho MLP)

  @ManyToOne(() => Tournament, (tournament) => tournament.formatDetails, { onDelete: 'CASCADE' })
  tournament: Tournament;
}
