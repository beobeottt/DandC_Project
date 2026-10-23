import { IsEmail, IsEnum } from "class-validator";
import { MemberRole } from "../../common/TournamentMember.enum";

export class InviteMembersDto {
    @IsEmail()
    email: string;

    @IsEnum(MemberRole)
    role: MemberRole;
}