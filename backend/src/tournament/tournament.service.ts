import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tournament } from './Entities/tounament.entity';
import { TournamentMember } from './Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { CreateTournamentDto } from './Dtos/create-tournament.dto';
import { SetupTournamentDto } from './Dtos/setup-tournament.dto';
import { InviteMembersDto } from './Dtos/invite-members.dto';
import { RespondInvitationDto } from './Dtos/respond-invitation.dto';
import { TournamentStatus } from '../common/Tournament.enum';
import { InvitationStatus, MemberRole } from '../common/TournamentMember.enum';
import { DrawGateway } from '../draw/draw.gateway';


@Injectable()
export class TournamentService {
    constructor(
        @InjectRepository(Tournament) private tournaments: Repository<Tournament>,
        @InjectRepository(TournamentMember) private members: Repository<TournamentMember>,
        @InjectRepository(User) private users: Repository<User>,
        private readonly drawGateway: DrawGateway,
    ) { }

    async getOwned(id: string, organizerId: string) {
        const tournament = await this.tournaments.findOne({
            where: { id },
        });

        if (!tournament) {
            throw new NotFoundException('Tournament not found');
        }

        if (tournament.organizerId !== organizerId) {
            throw new ForbiddenException('You do not have permission to modify this tournament');
        }

        return tournament;
    }

    async create(organizerId: string, dto: CreateTournamentDto): Promise<Tournament> {
        const tournament = this.tournaments.create({
            ...dto,
            organizerId, // Gán trực tiếp từ Token, bỏ qua payload của client
            startAt: new Date(dto.startAt),
            status: TournamentStatus.DRAFT,
        });
        return this.tournaments.save(tournament);
    }

    async setup(id: string, organizerId: string, dto: SetupTournamentDto) {
        const tournament = await this.getOwned(id, organizerId);

        if ([TournamentStatus.CANCELLED, TournamentStatus.COMPLETED].includes(tournament.status)) {
            throw new BadRequestException('Cannot modify tournament in its current status');
        }
        
        const { organizerId: _, ...changes } = dto as any;

        Object.assign(tournament, changes);
        return this.tournaments.save(tournament);
    }

    async invite(id: string, organizerId: string, dto: InviteMembersDto) {
        const tournament = await this.getOwned(id, organizerId);
        
        if (tournament.status === TournamentStatus.CANCELLED || tournament.drawLocked) {
            throw new BadRequestException('The tournament is cancelled or locked');
        }

        // Kiểm tra xem tất cả user được mời có tồn tại không
        const users = await this.users.find({
            where: { id: In(dto.userIds) }
        });

        if (users.length !== new Set(dto.userIds).size) {
            throw new BadRequestException('One or more selected users do not exist');
        }

        const existingMembers = await this.members.find({
            where: { 
                tournamentId: id, 
                userId: In(dto.userIds), 
                role: dto.role 
            }
        });
        const existingUserIds = existingMembers.map(m => m.userId);

        const newUsers = dto.userIds.filter(userId => !existingUserIds.includes(userId));
        
        const newMemberships = newUsers.map(userId => this.members.create({
            tournamentId: id,
            userId,
            role: dto.role,
            invitationStatus: InvitationStatus.PENDING,
        }));

        if (newMemberships.length > 0) {
            await this.members.save(newMemberships);
        }

        tournament.status = TournamentStatus.INVITING;
        await this.tournaments.save(tournament);
        
        return this.summary(id, organizerId);
    }

    async respond(id: string, userId: string, dto: RespondInvitationDto) {
        const member = await this.members.findOne({
            where: {
                tournamentId: id,
                userId: userId, // Lấy từ Token, không lấy từ DTO
            }
        });

        if (!member) {
            throw new NotFoundException('Invitation not found');
        }

        if (member.invitationStatus !== InvitationStatus.PENDING) {
            throw new BadRequestException('You have already answered this invitation');
        }

        member.invitationStatus = dto.status;
        member.respondedAt = new Date();

        if (dto.status === InvitationStatus.ACCEPTED && member.role === MemberRole.PLAYER) {
            await this.users.update(userId, { 
                playingHand: dto.playingHand, 
                preferredPosition: dto.preferredPosition,
                skills: dto.skills
            });
        }

        await this.members.save(member);
        return this.summary(id);
    }

    async summary(id: string, organizerId?: string) {
        const tournament = await this.tournaments.findOne({
            where: { id }
        });

        if (!tournament) {
            throw new NotFoundException('Tournament not found');
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
        
        const playerPercent = playersInvited ? Math.floor((playersAccepted / playersInvited) * 100) : 0;
        
        return {
            tournament, 
            playersInvited, 
            playersAccepted, 
            playerPercent,
            refereesInvited, 
            refereesAccepted,
            playersPending: count(MemberRole.PLAYER, InvitationStatus.PENDING),
            playersDeclined: count(MemberRole.PLAYER, InvitationStatus.DECLINED),
            refereesPending: count(MemberRole.REFEREE, InvitationStatus.PENDING),
            canDraw: playersInvited > 0 && 
                     playerPercent >= tournament.confirmation_Threshold &&
                     !tournament.drawLocked && 
                     ![TournamentStatus.CANCELLED, TournamentStatus.IN_PROGRESS, TournamentStatus.COMPLETED].includes(tournament.status),
            members,
        };
    }

    async cancel(id: string, organizerId: string) {
        const tournament = await this.getOwned(id, organizerId);
        
        if (tournament.status === TournamentStatus.IN_PROGRESS || tournament.drawLocked) {
            throw new BadRequestException('Cannot cancel tournament when Draw is locked or in progress');
        }
        
        tournament.status = TournamentStatus.CANCELLED;
        const savedTournament = await this.tournaments.save(tournament);

        this.drawGateway.server.to(`tournament_${id}`).emit('tournamentCancelled', { tournamentId: id });
        return this.tournaments.save(tournament);
    }

    async getInvitedList(id: string, organizerId: string) {
      await this.getOwned(id, organizerId);

      const members = await this.members.find({
          where: { tournamentId: id },
          relations: { 
              user: true
          }
      });

      return members.map(m => ({
          userId: m.userId,
          role: m.role,
          invitationStatus: m.invitationStatus,
          fullName: m.user?.fullName || 'Người dùng ẩn danh',
          avatarUrl: m.user?.avatarUrl || null,
          gender: m.gender,
          respondedAt: m.respondedAt
      }));
  }
}
