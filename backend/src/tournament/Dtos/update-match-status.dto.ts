import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MatchStatus } from '../../common/Match.enum';

export class UpdateMatchStatusDto {
  @IsEnum(MatchStatus)
  status: MatchStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  scoreA?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  scoreB?: number;
}
