import { IsIn } from 'class-validator';
import { OrganizerApprovalStatus } from '../../common/TournamentMember.enum';

export class OrganizerApprovalDto {
  @IsIn([OrganizerApprovalStatus.APPROVED, OrganizerApprovalStatus.REJECTED])
  status: OrganizerApprovalStatus.APPROVED | OrganizerApprovalStatus.REJECTED;
}
