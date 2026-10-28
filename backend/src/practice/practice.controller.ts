import { Body, Controller, Get, Param, Post, Request as Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/User.enum';
import { CreatePracticeSessionDto } from './Dtos/create-practice-session.dto';
import { PracticeService } from './practice.service';

interface AuthenticatedPracticeRequest extends Request {
  user: { id: string };
}

@Controller('practice')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get('organizer/tournaments')
  @Roles(UserRole.ORGANIZER)
  listOrganizerTournaments(@Req() req: AuthenticatedPracticeRequest) {
    return this.practiceService.listOrganizerTournaments(req.user.id);
  }

  @Get('organizer/tournaments/:tournamentId/players')
  @Roles(UserRole.ORGANIZER)
  listTournamentPlayers(@Req() req: AuthenticatedPracticeRequest, @Param('tournamentId') tournamentId: string) {
    return this.practiceService.listTournamentPlayers(tournamentId, req.user.id);
  }

  @Post('sessions')
  @Roles(UserRole.ORGANIZER)
  createSession(@Req() req: AuthenticatedPracticeRequest, @Body() dto: CreatePracticeSessionDto) {
    return this.practiceService.createSession(req.user.id, dto);
  }

  @Get('history')
  getMyHistory(@Req() req: AuthenticatedPracticeRequest) {
    return this.practiceService.getPlayerHistory(req.user.id);
  }
}
