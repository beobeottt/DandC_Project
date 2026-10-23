import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament } from './Entities/tounament.entity';
import { TournamentMember } from './Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { Match } from '../draw/Entities/match.entity';
import { Team } from '../draw/Entities/team.entity';
import { CreateTournamentDto } from './Dtos/create-tournament.dto';
import { SetupTournamentDto } from './Dtos/setup-tournament.dto';
import { InviteMembersDto } from './Dtos/invite-members.dto';
import { RespondInvitationDto } from './Dtos/respond-invitation.dto';
import { TournamentStatus } from '../common/Tournament.enum';
import { InvitationStatus, MemberRole, OrganizerApprovalStatus } from '../common/TournamentMember.enum';
import { DrawGateway } from '../draw/draw.gateway';
import { MatchStatus } from '../common/Match.enum';
import { UserRole } from '../common/User.enum';
import { AddGuestPlayerDto } from './Dtos/add-guest-player.dto';
import { UpdateMatchScoreDto } from './Dtos/update-match-score.dto';


@Injectable()
export class TournamentService {
    constructor(
        @InjectRepository(Tournament) private tournaments: Repository<Tournament>,
        @InjectRepository(TournamentMember) private members: Repository<TournamentMember>,
        @InjectRepository(User) private users: Repository<User>,
        @InjectRepository(Match) private matches: Repository<Match>,
        @InjectRepository(Team) private teams: Repository<Team>,
        private readonly drawGateway: DrawGateway,
    ) { }

    async findAll() {
        return this.tournaments.find();
    }

    async findOwnedWithManagementSummary(organizerId: string) {
        const tournaments = await this.tournaments.find({
            where: { organizerId },
            order: { startAt: 'ASC' },
        });
        if (tournaments.length === 0) return [];

        const tournamentIds = tournaments.map(tournament => tournament.id);
        const members = await this.members.createQueryBuilder('member')
            .leftJoinAndSelect('member.user', 'user')
            .where('member.tournamentId IN (:...tournamentIds)', { tournamentIds })
            .orderBy('member.createdAt', 'ASC')
            .getMany();

        return tournaments.map(tournament => {
            const tournamentMembers = members.filter(member => member.tournamentId === tournament.id);
            const players = tournamentMembers.filter(member => member.role === MemberRole.PLAYER);
            const eligiblePlayers = players.filter(member =>
                member.invitationStatus === InvitationStatus.ACCEPTED &&
                member.organizerApprovalStatus === OrganizerApprovalStatus.APPROVED,
            );
            const playersAwaitingApproval = players.filter(member =>
                member.invitationStatus === InvitationStatus.ACCEPTED &&
                member.organizerApprovalStatus === OrganizerApprovalStatus.PENDING,
            );
            const playersAwaitingResponse = players.filter(member =>
                member.invitationStatus === InvitationStatus.PENDING,
            );
            const rejectedPlayers = players.filter(member =>
                member.invitationStatus === InvitationStatus.DECLINED ||
                member.organizerApprovalStatus === OrganizerApprovalStatus.REJECTED,
            );
            const approvedCount = eligiblePlayers.length;
            const approvalRate = players.length
                ? Math.floor((approvedCount / players.length) * 100)
                : 0;

            return {
                ...tournament,
                management: {
                    invitedPlayers: players.length,
                    acceptedPlayers: players.filter(member => member.invitationStatus === InvitationStatus.ACCEPTED).length,
                    eligiblePlayers: approvedCount,
                    playersAwaitingResponse: playersAwaitingResponse.length,
                    playersAwaitingOrganizerApproval: playersAwaitingApproval.length,
                    refereesInvited: tournamentMembers.filter(member => member.role === MemberRole.REFEREE).length,
                    refereesAccepted: tournamentMembers.filter(member =>
                        member.role === MemberRole.REFEREE &&
                        member.invitationStatus === InvitationStatus.ACCEPTED,
                    ).length,
                    approvalRate,
                    confirmationThreshold: tournament.confirmation_Threshold,
                    canDraw: approvedCount > 0 &&
                        approvalRate >= tournament.confirmation_Threshold &&
                        !tournament.drawLocked &&
                        ![TournamentStatus.CANCELLED, TournamentStatus.IN_PROGRESS, TournamentStatus.COMPLETED].includes(tournament.status),
                    eligiblePlayerList: eligiblePlayers.map(member => ({
                        memberId: member.id,
                        fullName: member.guestFullName || member.user?.fullName || 'VĐV',
                        gender: member.gender,
                        isGuest: !member.userId,
                    })),
                    awaitingApprovalPlayerList: playersAwaitingApproval.map(member => ({
                        memberId: member.id,
                        fullName: member.guestFullName || member.user?.fullName || 'VĐV',
                        gender: member.gender,
                        isGuest: !member.userId,
                    })),
                    awaitingResponsePlayerList: playersAwaitingResponse.map(member => ({
                        memberId: member.id,
                        fullName: member.guestFullName || member.user?.fullName || 'VĐV',
                        gender: member.gender,
                        isGuest: !member.userId,
                    })),
                    rejectedPlayerList: rejectedPlayers.map(member => ({
                        memberId: member.id,
                        fullName: member.guestFullName || member.user?.fullName || 'VĐV',
                        gender: member.gender,
                        isGuest: !member.userId,
                    })),
                },
            };
        });
    }

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

    async create(dto: CreateTournamentDto, organizerId: string) {
        const tournament = this.tournaments.create({
            name: dto.name,
            location: dto.location,
            startAt: new Date(dto.startAt),
            competition_Type: dto.competitionType,
            bracket_Type: dto.drawFormat,
            organizerId,
            formatDetails: dto.formatsDetail,
        });

        return await this.tournaments.save(tournament);
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

        const email = typeof dto.email === 'string' ? dto.email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new BadRequestException('Email không hợp lệ');
        }
        if (![MemberRole.PLAYER, MemberRole.REFEREE].includes(dto.role)) {
            throw new BadRequestException('Vai trò được mời không hợp lệ');
        }
        const invitedUser = await this.users.findOne({ where: { email } });
        if (!invitedUser) throw new NotFoundException('Không tìm thấy tài khoản theo email này');
        const requiredUserRole = dto.role === MemberRole.PLAYER ? UserRole.PLAYER : UserRole.REFEREE;
        if (invitedUser.role !== requiredUserRole) {
            throw new BadRequestException(
                dto.role === MemberRole.PLAYER
                    ? 'Chỉ có thể mời tài khoản vận động viên'
                    : 'Email này chưa thuộc tài khoản trọng tài',
            );
        }

        const existingMember = await this.members.findOne({
            where: { tournamentId: id, userId: invitedUser.id },
        });
        if (existingMember) {
            if (existingMember.role !== dto.role) {
                throw new BadRequestException('Tài khoản đã được thêm vào giải với vai trò khác');
            }
            if (existingMember.invitationStatus === InvitationStatus.PENDING) {
                throw new BadRequestException('Lời mời đang chờ phản hồi');
            }
            if (
                existingMember.invitationStatus === InvitationStatus.ACCEPTED &&
                existingMember.organizerApprovalStatus === OrganizerApprovalStatus.PENDING
            ) {
                throw new BadRequestException('Thành viên đã nhận lời và đang chờ Ban tổ chức duyệt');
            }
            if (existingMember.organizerApprovalStatus === OrganizerApprovalStatus.APPROVED) {
                throw new BadRequestException('Thành viên này đã được duyệt vào giải');
            }
            existingMember.invitationStatus = InvitationStatus.PENDING;
            existingMember.organizerApprovalStatus = OrganizerApprovalStatus.PENDING;
            existingMember.respondedAt = null;
            await this.members.save(existingMember);
        } else {
            await this.members.save(this.members.create({
                tournamentId: id,
                userId: invitedUser.id,
                role: dto.role,
                invitationStatus: InvitationStatus.PENDING,
                organizerApprovalStatus: OrganizerApprovalStatus.PENDING,
            }));
        }

        tournament.status = TournamentStatus.INVITING;
        await this.tournaments.save(tournament);

        return this.summary(id, organizerId);
    }

    async addGuestPlayer(tournamentId: string, organizerId: string, dto: AddGuestPlayerDto) {
        const tournament = await this.getOwned(tournamentId, organizerId);
        if (tournament.drawLocked || [TournamentStatus.CANCELLED, TournamentStatus.COMPLETED].includes(tournament.status)) {
            throw new BadRequestException('Không thể thêm vận động viên khi giải đã khóa hoặc kết thúc');
        }
        const fullName = typeof dto.fullName === 'string' ? dto.fullName.trim() : '';
        const phone = typeof dto.phone === 'string' ? dto.phone.trim() : '';
        if (!fullName || fullName.length > 120) {
            throw new BadRequestException('Họ tên VĐV phải có từ 1 đến 120 ký tự');
        }
        if (!/^\+?[0-9\s()-]{6,20}$/.test(phone)) {
            throw new BadRequestException('Số điện thoại không hợp lệ');
        }
        if (dto.gender && !['male', 'female'].includes(dto.gender)) {
            throw new BadRequestException('Giới tính không hợp lệ');
        }
        const duplicate = await this.members.findOne({ where: { tournamentId, guestPhone: phone } });
        if (duplicate) throw new BadRequestException('Số điện thoại này đã được thêm vào giải');
        return this.members.save(this.members.create({
            tournamentId,
            userId: null,
            role: MemberRole.PLAYER,
            guestFullName: fullName,
            guestPhone: phone,
            gender: dto.gender ?? null,
            invitationStatus: InvitationStatus.ACCEPTED,
            organizerApprovalStatus: OrganizerApprovalStatus.PENDING,
        }));
    }

    async approveMember(
        tournamentId: string,
        memberId: string,
        organizerId: string,
        status: OrganizerApprovalStatus,
    ) {
        await this.getOwned(tournamentId, organizerId);
        const member = await this.members.findOne({ where: { id: memberId, tournamentId } });
        if (!member || member.role !== MemberRole.PLAYER) {
            throw new NotFoundException('Không tìm thấy vận động viên trong giải');
        }
        if (status === OrganizerApprovalStatus.PENDING) {
            throw new BadRequestException('Trạng thái duyệt chỉ có thể là APPROVED hoặc REJECTED');
        }
        if (![OrganizerApprovalStatus.APPROVED, OrganizerApprovalStatus.REJECTED].includes(status)) {
            throw new BadRequestException('Trạng thái duyệt không hợp lệ');
        }
        if (member.userId && member.invitationStatus !== InvitationStatus.ACCEPTED) {
            throw new BadRequestException('Vận động viên cần chấp nhận lời mời trước khi Ban tổ chức quyết định');
        }
        if (member.invitationStatus === InvitationStatus.DECLINED) {
            throw new BadRequestException('Vận động viên đã từ chối lời mời');
        }
        member.organizerApprovalStatus = status;
        return this.members.save(member);
    }

    async respond(id: string, userId: string, userRole: string, dto: RespondInvitationDto) {
        const member = await this.members.findOne({
            where: {
                tournamentId: id,
                userId: userId, // Lấy từ Token, không lấy từ DTO
            }
        });

        if (!member) {
            throw new NotFoundException('Invitation not found');
        }
        const expectedRole = member.role === MemberRole.PLAYER ? UserRole.PLAYER : UserRole.REFEREE;
        if (userRole !== expectedRole) {
            throw new ForbiddenException('Lời mời này không thuộc vai trò tài khoản của bạn');
        }

        if (member.invitationStatus !== InvitationStatus.PENDING) {
            throw new BadRequestException('You have already answered this invitation');
        }
        if (![InvitationStatus.ACCEPTED, InvitationStatus.DECLINED].includes(dto.status)) {
            throw new BadRequestException('Phản hồi lời mời chỉ được là ACCEPTED hoặc DECLINED');
        }

        member.invitationStatus = dto.status;
        member.respondedAt = new Date();
        if (dto.status === InvitationStatus.DECLINED) {
            member.organizerApprovalStatus = OrganizerApprovalStatus.REJECTED;
        }

        if (dto.status === InvitationStatus.ACCEPTED && member.role === MemberRole.PLAYER && member.userId) {
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

        // Chỉ kiểm tra quyền organizerId nếu truyền vào và không phải hệ thống gọi ngầm
        if (organizerId && tournament.organizerId !== organizerId) {
            throw new ForbiddenException('Bạn không có quyền xem thông tin chi tiết quản lý của giải đấu này');
        }

        const members = await this.members.find({
            where: { tournamentId: id },
            relations: { user: true },
        });

        const count = (role: MemberRole, status: InvitationStatus) =>
            members.filter(m => m.role === role && m.invitationStatus === status).length;

        const playersInvited = members.filter(m => m.role === MemberRole.PLAYER).length;
        const playersAccepted = members.filter(m =>
            m.role === MemberRole.PLAYER &&
            m.invitationStatus === InvitationStatus.ACCEPTED &&
            m.organizerApprovalStatus === OrganizerApprovalStatus.APPROVED
        ).length;
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
            playersPending: members.filter(m =>
                m.role === MemberRole.PLAYER &&
                (m.invitationStatus === InvitationStatus.PENDING ||
                 (m.invitationStatus === InvitationStatus.ACCEPTED &&
                  m.organizerApprovalStatus === OrganizerApprovalStatus.PENDING))
            ).length,
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
            memberId: m.id,
            userId: m.userId,
            role: m.role,
            invitationStatus: m.invitationStatus,
            organizerApprovalStatus: m.organizerApprovalStatus,
            fullName: m.guestFullName || m.user?.fullName || 'Người dùng ẩn danh',
            email: m.user?.email || null,
            phone: m.guestPhone || m.user?.phone || null,
            avatarUrl: m.user?.avatarUrl || null,
            gender: m.gender,
            respondedAt: m.respondedAt
        }));
    }

    async getHomeSummary() {
        // Lấy toàn bộ danh sách giải đấu từ database, sắp xếp theo thời gian tăng dần
        const tournaments = await this.tournaments.find({
            order: { startAt: 'ASC' },
        });

        const now = new Date();
        const liveMatches: any[] = [];
        const upcomingMatches: any[] = [];

        for (const t of tournaments) {
            if (!t.startAt) continue;

            const startDate = new Date(t.startAt);

            // Kiểm tra xem giải đấu có diễn ra TRONG CÙNG NGÀY hiện tại hay không
            const isToday =
                startDate.getDate() === now.getDate() &&
                startDate.getMonth() === now.getMonth() &&
                startDate.getFullYear() === now.getFullYear();

            if (isToday) {
                // Tìm trận đấu tâm điểm hoặc đang diễn ra trong giải này nếu có
                let currentMatch = await this.matches.findOne({
                    where: { tournamentId: t.id, status: 'IN_PROGRESS' },
                    order: { round: 'ASC', matchNumber: 'ASC' }
                });

                if (!currentMatch) {
                    currentMatch = await this.matches.findOne({
                        where: { tournamentId: t.id, status: 'SCHEDULED' },
                        order: { round: 'ASC', matchNumber: 'ASC' }
                    });
                }

                let teamAName = 'Chờ phân cặp';
                let teamBName = 'Chờ phân cặp';

                if (currentMatch) {
                    if (currentMatch.teamAId) {
                        const teamA = await this.teams.findOne({ where: { id: currentMatch.teamAId } });
                        if (teamA) teamAName = teamA.name;
                    }
                    if (currentMatch.teamBId) {
                        const teamB = await this.teams.findOne({ where: { id: currentMatch.teamBId } });
                        if (teamB) teamBName = teamB.name;
                    }
                }

                liveMatches.push({
                    id: currentMatch ? currentMatch.id : t.id,
                    tournamentId: t.id,
                    tournamentName: t.name,
                    timeRemaining: currentMatch && currentMatch.status === 'IN_PROGRESS' ? 'Đang live' : 'Hôm nay',
                    teamA: teamAName,
                    teamB: teamBName,
                });
            } else if (startDate > now) {
                // Nếu ngày bắt đầu lớn hơn hiện tại -> Sắp diễn ra
                upcomingMatches.push({
                    id: t.id,
                    title: t.name,
                    time: startDate.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
                    tournamentId: t.id,
                    tournamentName: t.name,
                });
            }
        }

        return {
            liveMatches,
            upcomingMatches
        };
    }

    async updateMatchStatus(
        matchId: string,
        status: MatchStatus,
        scoreA: number | undefined,
        scoreB: number | undefined,
        requesterId: string,
        requesterRole: string,
    ) {
        const match = await this.matches.findOne({ where: { id: matchId } });
        if (!match) {
            throw new NotFoundException('Match not found');
        }
        await this.assertCanManageMatch(match.tournamentId, requesterId, requesterRole);
        if (!Object.values(MatchStatus).includes(status)) {
            throw new BadRequestException('Trạng thái trận đấu không hợp lệ');
        }
        if (
            (scoreA !== undefined && (!Number.isInteger(scoreA) || scoreA < 0)) ||
            (scoreB !== undefined && (!Number.isInteger(scoreB) || scoreB < 0))
        ) {
            throw new BadRequestException('Tỷ số phải là số nguyên không âm');
        }
        if (
            (status === MatchStatus.IN_PROGRESS && match.status !== MatchStatus.SCHEDULED) ||
            (status === MatchStatus.COMPLETED && match.status !== MatchStatus.IN_PROGRESS)
        ) {
            throw new BadRequestException('Trận đấu không thể chuyển sang trạng thái được yêu cầu');
        }

        match.status = status;
        if (scoreA !== undefined) match.scoreA = scoreA;
        if (scoreB !== undefined) match.scoreB = scoreB;

        const updatedMatch = await this.matches.save(match);

        // Bắn socket realtime nếu có
        this.drawGateway.server.to(`tournament_${match.tournamentId}`).emit('matchStatusUpdated', updatedMatch);

        return updatedMatch;
    }

    async updateMatchScore(
        matchId: string,
        dto: UpdateMatchScoreDto,
        requesterId: string,
        requesterRole: string,
    ) {
        const match = await this.matches.findOne({ where: { id: matchId } });
        if (!match) throw new NotFoundException('Match not found');
        await this.assertCanManageMatch(match.tournamentId, requesterId, requesterRole);
        if (match.status !== MatchStatus.IN_PROGRESS) {
            throw new BadRequestException('Chỉ có thể cập nhật điểm trận đang diễn ra');
        }
        if (
            !Number.isInteger(dto.scoreA) ||
            !Number.isInteger(dto.scoreB) ||
            dto.scoreA < 0 ||
            dto.scoreB < 0
        ) {
            throw new BadRequestException('Tỷ số phải là số nguyên không âm');
        }
        match.scoreA = dto.scoreA;
        match.scoreB = dto.scoreB;
        const savedMatch = await this.matches.save(match);
        this.drawGateway.server.to(`tournament_${match.tournamentId}`).emit('matchScoreUpdated', savedMatch);
        return savedMatch;
    }

    async updateMatchLiveLink(
        matchId: string,
        liveStreamUrl: string,
        requesterId: string,
        requesterRole: string,
    ) {
        const match = await this.matches.findOne({ where: { id: matchId } });
        if (!match) throw new NotFoundException('Match not found');
        await this.assertCanManageMatch(match.tournamentId, requesterId, requesterRole);
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(liveStreamUrl);
        } catch {
            throw new BadRequestException('Đường link livestream không hợp lệ');
        }
        if (
            liveStreamUrl.length > 2048 ||
            !['http:', 'https:'].includes(parsedUrl.protocol)
        ) {
            throw new BadRequestException('Chỉ chấp nhận đường link HTTP/HTTPS');
        }
        match.liveStreamUrl = liveStreamUrl;
        const savedMatch = await this.matches.save(match);
        this.drawGateway.server.to(`tournament_${match.tournamentId}`).emit('matchLiveLinkUpdated', {
            matchId,
            liveStreamUrl,
        });
        return savedMatch;
    }

    private async assertCanManageMatch(tournamentId: string, userId: string, role: string) {
        if (role === UserRole.ORGANIZER) {
            await this.getOwned(tournamentId, userId);
            return;
        }
        if (role === UserRole.REFEREE) {
            const membership = await this.members.findOne({
                where: {
                    tournamentId,
                    userId,
                    role: MemberRole.REFEREE,
                    invitationStatus: InvitationStatus.ACCEPTED,
                },
            });
            if (!membership) throw new ForbiddenException('Bạn chưa được mời làm trọng tài cho giải này');
            return;
        }
        throw new ForbiddenException('Bạn không có quyền điều khiển trận đấu');
    }

    async getTournamentMatches(tournamentId: string) {
        const tournament = await this.tournaments.findOne({
            where: { id: tournamentId }
        });

        if (!tournament) {
            throw new NotFoundException('Tournament not found');
        }

        const tournamentMatches = await this.matches.find({
            where: { tournamentId },
            order: { round: 'ASC', matchNumber: 'ASC' }
        });

        const teams = await this.teams.find({
            where: { tournamentId }
        });
        const playerMembers = await this.members.find({
            where: { tournamentId, role: MemberRole.PLAYER },
            relations: { user: true },
            order: { createdAt: 'ASC' },
        });

        const teamMap = new Map(teams.map(t => [t.id, t.name]));
        const mapPlayer = (member: TournamentMember) => ({
            memberId: member.id,
            fullName: member.guestFullName || member.user?.fullName || 'VĐV',
            gender: member.gender,
            isGuest: !member.userId,
        });
        const approvedPlayers = playerMembers.filter(member =>
            member.invitationStatus === InvitationStatus.ACCEPTED &&
            member.organizerApprovalStatus === OrganizerApprovalStatus.APPROVED,
        );
        const awaitingApprovalPlayers = playerMembers.filter(member =>
            member.invitationStatus === InvitationStatus.ACCEPTED &&
            member.organizerApprovalStatus === OrganizerApprovalStatus.PENDING,
        );
        const awaitingResponsePlayers = playerMembers.filter(member =>
            member.invitationStatus === InvitationStatus.PENDING,
        );
        const rejectedPlayers = playerMembers.filter(member =>
            member.invitationStatus === InvitationStatus.DECLINED ||
            member.organizerApprovalStatus === OrganizerApprovalStatus.REJECTED,
        );

        return {
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            playerRegistrations: {
                approved: approvedPlayers.map(mapPlayer),
                awaitingApproval: awaitingApprovalPlayers.map(mapPlayer),
                awaitingResponse: awaitingResponsePlayers.map(mapPlayer),
                rejected: rejectedPlayers.map(mapPlayer),
            },
            matches: tournamentMatches.map(m => ({
                id: m.id,
                round: `Vòng ${m.round}`,
                teamA: m.teamAId ? teamMap.get(m.teamAId) || 'Đội chưa xác định' : 'Chờ xác định',
                teamB: m.teamBId ? teamMap.get(m.teamBId) || 'Đội chưa xác định' : 'Chờ xác định',
                score: m.scoreA !== null && m.scoreB !== null ? `${m.scoreA} - ${m.scoreB}` : 'VS',
                scoreA: m.scoreA,
                scoreB: m.scoreB,
                liveStreamUrl: m.liveStreamUrl,
                rawStatus: m.status,
                status: m.status === 'IN_PROGRESS' ? 'Đang diễn ra' : m.status === 'COMPLETED' ? 'Đã kết thúc' : 'Sắp diễn ra',
            }))
        };
    }
}
