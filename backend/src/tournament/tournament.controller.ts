import { 
    Body, 
    Controller, 
    Get, 
    Param, 
    Patch, 
    Post, 
    UseGuards, 
    Request as Req
} from '@nestjs/common';
import { Request } from 'express'; // Import Request từ express
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './Dtos/create-tournament.dto';
import { SetupTournamentDto } from './Dtos/setup-tournament.dto';
import { InviteMembersDto } from './Dtos/invite-members.dto';
import { RespondInvitationDto } from './Dtos/respond-invitation.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/User.enum';

export interface AuthRequest extends Request {
    user: {
        id: string;
        role: string;
    };
}

@Controller('tournament')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TournamentController {
    constructor(private readonly service: TournamentService) {}

    @Post()
    @Roles(UserRole.ORGANIZER)
    create(
        @Req() req: AuthRequest, // Gán kiểu dữ liệu ở đây
        @Body() dto: CreateTournamentDto
    ) {
        return this.service.create(req.user.id, dto);
    }

    @Patch(':id/setup')
    @Roles(UserRole.ORGANIZER)
    setup(
        @Req() req: AuthRequest, 
        @Param('id') id: string,
        @Body() dto: SetupTournamentDto
    ) { 
        return this.service.setup(id, req.user.id, dto); 
    }

    @Post(':id/invitations')
    @Roles(UserRole.ORGANIZER)
    invite(
        @Req() req: AuthRequest, 
        @Param('id') id: string,
        @Body() dto: InviteMembersDto,
    ) {
        return this.service.invite(id, req.user.id, dto);
    }

    @Patch(':id/response')
    @Roles(UserRole.PLAYER, UserRole.REFEREE) 
    respond(
        @Req() req: AuthRequest,
        @Param('id') id: string,
        @Body() dto: RespondInvitationDto,
    ) {
        return this.service.respond(id, req.user.id, dto);
    }

    @Get(':id/summary')
    summary(
        @Param('id') id: string,
    ) {
        return this.service.summary(id);
    }

    @Patch(':id/cancel')
    @Roles(UserRole.ORGANIZER)
    cancel(
        @Req() req: AuthRequest,
        @Param('id') id: string,
    ) {
        return this.service.cancel(id, req.user.id);
    }

    @Get(':id')
    get(
        @Param('id') id: string
    ) {
        return this.service.summary(id); 
    }

    @Get(':id/invited-list')
    @Roles(UserRole.ORGANIZER)
    getInvitedList(
        @Req() req: AuthRequest,
        @Param('id') id: string,
    ) {
        return this.service.getInvitedList(id, req.user.id);
    }
}
