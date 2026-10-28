
import {
  IsArray,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { PickleballSkill, PlayingHand, PreferredPosition } from '../../common/player-skill.enum';


export class UpdatePlayerSkillsDto {
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
