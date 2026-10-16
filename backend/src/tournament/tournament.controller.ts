import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './Dtos/create-tournament.dto';
import { SetupTournamentDto } from './Dtos/setup-tournament.dto';
import { InviteMembersDto } from './Dtos/invite-members.dto';
import { RespondInvitationDto } from './Dtos/respond-invitation.dto';

@Controller('tournament')
export class TournamentController {
    constructor(private readonly service: TournamentService){}

    @Post()
    create(@Body() dto: CreateTournamentDto)
    {
        return this.service.create(dto);
    }

    @Patch(':id/setup')
    setup(
        @Param('id') id: string,
        @Body() dto: SetupTournamentDto
    )
    { 
        return this.service.setup(id, dto); 
    }

    @Post(':id/invitations')
    invite(
        @Param('id') id: string,
        @Body() dto: InviteMembersDto,
    )
    {
        return this.service.invite(id, dto);
    }

    @Patch(':id/response')
    respond(
        @Param('id') id: string,
        @Body() dto: RespondInvitationDto,
    )
    {
        return this.service.respond(id, dto);
    }

    @Get(':id/summary')
    summary(
        @Param('id') id: string,
    )
    {
        return this.service.summary(id);
    }

    @Patch(':id/cancel')
    cancel(
        @Param('id') id: string,
        @Body('organizerId') organizerId: string
    )
    {
        return this.service.cancel(id, organizerId);
    }

    @Get(':id')
    get(
        @Param('id') id: string
    )
    {
        return this.service.summary(id);
    }

}
