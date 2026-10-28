import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TournamentApprovalStatus } from '../../common/Tournament.enum';

export class TournamentApprovalDto {
  @IsIn([TournamentApprovalStatus.APPROVED, TournamentApprovalStatus.REJECTED])
  status: TournamentApprovalStatus.APPROVED | TournamentApprovalStatus.REJECTED;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason?: string;
}
