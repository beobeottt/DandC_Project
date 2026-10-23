import { IsArray, IsEnum, IsOptional } from "class-validator";
import { InvitationStatus } from "../../common/TournamentMember.enum";
import { PickleballSkill, PlayingHand, PreferredPosition } from "../../common/player-skill.enum";


export class RespondInvitationDto
{
    @IsEnum(InvitationStatus)
    status: InvitationStatus;

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