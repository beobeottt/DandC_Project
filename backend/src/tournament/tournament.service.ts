import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tournament } from './Entities/tounament.entity';
import { Repository, In } from 'typeorm';
import { TournamentMember } from './Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { CreateTournamentDto } from './Dtos/create-tournament.dto';
import { TournamentStatus } from '../common/Tournament.enum';
import { SetupTournamentDto } from './Dtos/setup-tournament.dto';
import { InviteMembersDto } from './Dtos/invite-members.dto';
import { InvitationStatus, MemberRole } from '../common/TournamentMember.enum';
import { RespondInvitationDto } from './Dtos/respond-invitation.dto';

@Injectable()
export class TournamentService {
    constructor(
        @InjectRepository(Tournament) private tournaments: Repository<Tournament>,
        @InjectRepository(TournamentMember) private members: Repository<TournamentMember>,
        @InjectRepository(User) private users: Repository<User>,
    ) { }

    async getOwned(id: string, organizerId: string)// tìm người tạo ra Tournament này
    {
        const tournament = await this.tournaments.findOne({
            where: { id },
        });

        if (!tournament) {
            throw new NotFoundException('Do not have tournament follow this id');
        }

        if (tournament.organizerId !== organizerId) {
            throw new ForbiddenException('You can not set up this Page');
        }

        return tournament;
    }


    async create(dto: CreateTournamentDto): Promise<Tournament> {
        const tournament = this.tournaments.create({
            ...dto, startAt: new Date(dto.startAt),
            status: TournamentStatus.DRAFT,
        });
        return this.tournaments.save(tournament);
    }

    async setup(id: string, dto: SetupTournamentDto) {
        const tournament = await this.getOwned(id, dto.organizerId);

        if ([TournamentStatus.CANCELLED, TournamentStatus.COMPLETED].includes(tournament.status)) {
            throw new BadRequestException('Can not fix information in this status of Tournament');
        }
        const { organizerId, ...changes } = dto;

        Object.assign(tournament, changes);
        return this.tournaments.save(tournament);
    }

    async invite(id: string, dto: InviteMembersDto) {
        const tournament = await this.getOwned(id, dto.organizerId);
        if (tournament.status === TournamentStatus.CANCELLED || tournament.drawLocked) throw new BadRequestException('The tournament cancle or locked');
        const users = await this.users.find({
            where: { id: In(dto.userIds) }
        });

        if (users.length !== new Set(dto.userIds).size) {
            throw new BadRequestException('Some users are not exists');
        }

        const rows = dto.userIds.map(userId => this.members.create({
            tournamentId: id,
            userId,
            role: dto.role,
            invitationStatus: InvitationStatus.PENDING,
        }));

        for (const row of rows) {
            const existing = await this.members.findOne({ where: { tournamentId: id, userId: row.userId, role: row.role } });

            if (!existing) {
                await this.members.save(row);
            }

        }
        tournament.status = TournamentStatus.INVITING;
        await this.tournaments.save(tournament);
        return this.summary(id, dto.organizerId);
    }

    async respond(id: string, dto: RespondInvitationDto) {
        const member = await this.members.findOne({
            where: {
                tournamentId: id,
                userId: dto.userId,
            }
        });

        if (!member) {
            throw new NotFoundException('Do not have invitation');
        }

        if (member.invitationStatus !== InvitationStatus.PENDING) {
            throw new BadRequestException('allready answer your Invitation');
        }
        member.invitationStatus = dto.status;
        member.respondedAt = new Date();
        await this.members.save(member);
        return this.summary(id);
    }

    async summary(id: string, organizerId?: string) {
        const tournament = await this.tournaments.findOne({
            where: { id }
        });

        if (!tournament) {
            throw new NotFoundException('Do not have this tournament');
        }
        if (organizerId && tournament.organizerId !== organizerId) {
            throw new ForbiddenException();
        }

        const members = await this.members.find({
            where: { tournamentId: id }
        });

        const count = (role: MemberRole, status: InvitationStatus) =>
            members.filter(m => m.role === role && m.invitationStatus === status).length;

        const playersInvited = members.filter(m => m.role === MemberRole.PLAYER).length;
        const playersAccepted = count(MemberRole.PLAYER, InvitationStatus.ACCEPTED);
        const refereesInvited = members.filter(m => m.role === MemberRole.REFEREE).length;
        const refereesAccepted = count(MemberRole.REFEREE, InvitationStatus.ACCEPTED);
        const playerPercent = playersInvited ? Math.floor(playersAccepted / playersInvited * 100) : 0;
        return {
            tournament, playersInvited, playersAccepted, playerPercent,
            refereesInvited, refereesAccepted,
            playersPending: count(MemberRole.PLAYER, InvitationStatus.PENDING),
            playersDeclined: count(MemberRole.PLAYER, InvitationStatus.DECLINED),
            refereesPending: count(MemberRole.REFEREE, InvitationStatus.PENDING),
            canDraw: playersInvited > 0 && playerPercent >= tournament.confirmation_Threshold &&
                !tournament.drawLocked && ![TournamentStatus.CANCELLED, TournamentStatus.IN_PROGRESS, TournamentStatus.COMPLETED].includes(tournament.status),
            members,
        };
    }
    async cancel(id: string, organizerId: string) {
    const tournament = await this.getOwned(id, organizerId);
    if (tournament.status === TournamentStatus.IN_PROGRESS || tournament.drawLocked)
        {
            throw new BadRequestException('Can not cancel when Draw have been Locked');
        } 
    tournament.status = TournamentStatus.CANCELLED;
    return this.tournaments.save(tournament);
  }

}
