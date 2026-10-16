
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { InvitationStatus, MemberRole } from '../../common/TournamentMember.enum';
import { CourtPosition, PickleballSkill, PlayingHand } from '../../common/player-skill.enum';

@Entity('tournament_members')
@Unique(['tournamentId', 'userId'])
export class TournamentMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tournamentId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: MemberRole })
  role: MemberRole;

  @Column({ type: 'varchar', nullable: true })
  gender: string | null;

  @Column({ type: 'enum', enum: PlayingHand, nullable: true })
  playingHand: PlayingHand | null;

  @Column({ type: 'enum', enum: CourtPosition, nullable: true })
  preferredPosition: CourtPosition | null;

  @Column({type: 'jsonb', default: () => "'[]'::jsonb'" })
  skills: PickleballSkill[];

  @Column({ type: 'boolean', default: false })
  profileConfirmed: boolean;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  invitationStatus: InvitationStatus; // trạng thái của thư mời

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
