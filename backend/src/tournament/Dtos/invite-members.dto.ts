import { ArrayMinSize, IsArray, IsEnum, IsUUID } from "class-validator";
import { MemberRole } from "../../common/TournamentMember.enum";

export class InviteMembersDto
{
    @IsUUID()
    organizerId: string;

    @IsArray()
    @ArrayMinSize(1)
    @IsUUID('4', {each: true})
    userIds: string[];

    @IsEnum(MemberRole)
    role: MemberRole;
}