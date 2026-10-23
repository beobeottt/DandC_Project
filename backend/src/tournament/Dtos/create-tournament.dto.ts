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
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompetitionType, TournamentFormat, TournamentStatus } from '../../common/Tournament.enum';
import { DrawFormat } from '../../common/Draw.enum';

class FormatDetailDto {
  @IsEnum(TournamentFormat, { message: 'Định dạng nội dung không hợp lệ' })
  format: TournamentFormat;

  @IsInt()
  @Min(2)
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
}
