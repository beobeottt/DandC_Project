import { IsEnum, IsUUID } from "class-validator";
import { InvitationStatus } from "../../common/TournamentMember.enum";


export class RespondInvitationDto
{
    @IsUUID()
    userId: string;

    @IsEnum(InvitationStatus)
    status: InvitationStatus;

}