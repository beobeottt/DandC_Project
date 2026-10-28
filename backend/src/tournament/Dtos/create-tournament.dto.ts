import { 
  IsDateString, 
  IsEnum, 
  IsInt, 
  IsOptional, 
  IsString, 
  MaxLength, 
  Min, 
  Max, 
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsIn,
  IsUrl,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CompetitionType,
  TournamentAwardType,
  TournamentFormat,
} from '../../common/Tournament.enum';
import { DrawFormat } from '../../common/Draw.enum';

class FormatDetailDto {
  @IsEnum(TournamentFormat, { message: 'Định dạng nội dung không hợp lệ' })
  format: TournamentFormat;

  @IsInt()
  @Min(2)
  @Max(10000)
  maxPlayers: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  menPerTeam?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  womenPerTeam?: number;
}

export class CreateTournamentDto {
  @IsString()
  @MaxLength(160)
  name: string;

  @IsString()
  @MaxLength(240)
  location: string;

  @IsDateString()
  startAt: string;

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
  @ArrayMinSize(1)
  @IsIn(Object.values(TournamentAwardType), { each: true })
  awardTypes?: TournamentAwardType[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  feePerPlayer?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  championPrizeMoney?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @IsUrl({ require_tld: false })
  contactLink?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Phải cấu hình ít nhất một nội dung thi đấu' })
  @ValidateNested({ each: true })
  @Type(() => FormatDetailDto)
  formatsDetail: FormatDetailDto[];

  @IsOptional()
  @IsEnum(CompetitionType)
  competitionType?: CompetitionType;

  @IsOptional()
  @IsEnum(DrawFormat)
  drawFormat?: DrawFormat;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([2, 3])
  qualifiersPerGroup?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  bronzeMatchEnabled?: boolean;
}
