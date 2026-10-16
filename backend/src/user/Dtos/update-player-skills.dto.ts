
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PickleballSkill, PlayingHand, PreferredPosition } from '../../common/player-skill.enum';


export class UpdatePlayerSkillsDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1.0)
  @Max(6.0)
  level?: number;

  @IsOptional()
  @IsEnum(PlayingHand)
  playingHand?: PlayingHand;

  @IsOptional()
  @IsEnum(PreferredPosition)
  preferredPosition?: PreferredPosition;

  @IsOptional()
  @IsArray()
  @IsEnum(PickleballSkill, { each: true })
  skills?: PickleballSkill[];
}
