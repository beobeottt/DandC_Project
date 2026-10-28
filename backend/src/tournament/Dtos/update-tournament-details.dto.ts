import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TournamentAwardType } from '../../common/Tournament.enum';

export class UpdateTournamentDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  location?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(TournamentAwardType), { each: true })
  awardTypes?: TournamentAwardType[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  feePerPlayer?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  championPrizeMoney?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({ require_tld: false })
  contactLink?: string;

  @IsOptional()
  @IsInt()
  @IsIn([2, 3])
  qualifiersPerGroup?: number;

  @IsOptional()
  @IsBoolean()
  bronzeMatchEnabled?: boolean;
}
