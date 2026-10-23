import { IsEnum } from 'class-validator';
import { OrganizerApprovalStatus } from '../../common/TournamentMember.enum';

export class ApproveMemberDto {
  @IsEnum(OrganizerApprovalStatus)
  status: OrganizerApprovalStatus;
}
