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
import { AddGuestPlayerDto } from './Dtos/add-guest-player.dto';
import { ApproveMemberDto } from './Dtos/approve-member.dto';
import { UpdateMatchScoreDto } from './Dtos/update-match-score.dto';
import { UpdateMatchLiveLinkDto } from './Dtos/update-match-live-link.dto';
import { UpdateMatchStatusDto } from './Dtos/update-match-status.dto';
import { MatchStatus } from '../common/Match.enum';
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
        return this.service.create(dto, req.user.id);
    }

        @Get('home-summary')
    async getHomeSummary() {
        return this.service.getHomeSummary();
    }

    @Get('all')
    getAllTournaments() {
        return this.service.findAll();
    }

    @Get('my')
    @Roles(UserRole.ORGANIZER)
    getMyTournaments(@Req() req: AuthRequest) {
        return this.service.findOwnedWithManagementSummary(req.user.id);
    }

    @Get('organizer/my-tournaments')
    @Roles(UserRole.ORGANIZER)
    getOrganizerTournaments(@Req() req: AuthRequest) {
        return this.service.findOwnedWithManagementSummary(req.user.id);
    }

    @Patch('match/:matchId/status')
    @Roles(UserRole.ORGANIZER, UserRole.REFEREE)
    updateMatchStatus(
        @Req() req: AuthRequest,
        @Param('matchId') matchId: string,
        @Body() body: UpdateMatchStatusDto
    ) {
        const { status, scoreA, scoreB } = body;
        return this.service.updateMatchStatus(matchId, status, scoreA, scoreB, req.user.id, req.user.role);
    }

    @Patch('match/:matchId/score')
    @Roles(UserRole.ORGANIZER, UserRole.REFEREE)
    updateMatchScore(
        @Req() req: AuthRequest,
        @Param('matchId') matchId: string,
        @Body() dto: UpdateMatchScoreDto,
    ) {
        return this.service.updateMatchScore(matchId, dto, req.user.id, req.user.role);
    }

    @Patch('match/:matchId/live-link')
    @Roles(UserRole.ORGANIZER, UserRole.REFEREE)
    updateMatchLiveLink(
        @Req() req: AuthRequest,
        @Param('matchId') matchId: string,
        @Body() dto: UpdateMatchLiveLinkDto,
    ) {
        return this.service.updateMatchLiveLink(matchId, dto.liveStreamUrl, req.user.id, req.user.role);
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

    @Post(':id/guest-players')
    @Roles(UserRole.ORGANIZER)
    addGuestPlayer(
        @Req() req: AuthRequest,
        @Param('id') id: string,
        @Body() dto: AddGuestPlayerDto,
    ) {
        return this.service.addGuestPlayer(id, req.user.id, dto);
    }

    @Patch(':id/members/:memberId/approval')
    @Roles(UserRole.ORGANIZER)
    approveMember(
        @Req() req: AuthRequest,
        @Param('id') id: string,
        @Param('memberId') memberId: string,
        @Body() dto: ApproveMemberDto,
    ) {
        return this.service.approveMember(id, memberId, req.user.id, dto.status);
    }

    @Patch(':id/response')
    @Roles(UserRole.PLAYER, UserRole.REFEREE) 
    respond(
        @Req() req: AuthRequest,
        @Param('id') id: string,
        @Body() dto: RespondInvitationDto,
    ) {
        return this.service.respond(id, req.user.id, req.user.role, dto);
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



    @Get(':id/matches')
    async getTournamentMatches(
        @Param('id') tournamentId: string
    ) {
        return this.service.getTournamentMatches(tournamentId);
    }
}
