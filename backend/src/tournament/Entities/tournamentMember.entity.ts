
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InvitationStatus, MemberRole, OrganizerApprovalStatus } from '../../common/TournamentMember.enum';
import { CourtPosition, PickleballSkill, PlayingHand } from '../../common/player-skill.enum';
import { Tournament } from './tounament.entity';
import { User } from '../../user/Entities/user.entity';

@Entity('tournament_members')
@Unique(['tournamentId', 'userId'])
export class TournamentMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tournamentId: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  guestFullName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  guestPhone: string | null;

  @Column({ type: 'enum', enum: OrganizerApprovalStatus, default: OrganizerApprovalStatus.PENDING })
  organizerApprovalStatus: OrganizerApprovalStatus;

  @Column({ type: 'enum', enum: MemberRole })
  role: MemberRole;

  @Column({ type: 'varchar', nullable: true })
  gender: string | null;

  @Column({ type: 'enum', enum: PlayingHand, nullable: true })
  playingHand: PlayingHand | null;

  @Column({ type: 'enum', enum: CourtPosition, nullable: true })
  preferredPosition: CourtPosition | null;

  @Column({type: 'jsonb', default: () => "'[]'::jsonb" })
  skills: PickleballSkill[];

  @Column({ type: 'boolean', default: false })
  profileConfirmed: boolean;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  invitationStatus: InvitationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Tournament) 
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;
}
