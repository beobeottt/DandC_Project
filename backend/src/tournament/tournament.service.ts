import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Tournament } from './Entities/tounament.entity';
import { TournamentMember } from './Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { Match } from '../draw/Entities/match.entity';
import { Team } from '../draw/Entities/team.entity';
import { TournamentGroup } from '../draw/Entities/group.entity';
import { TeamMember } from '../draw/Entities/teamMember.entity';
import { CreateTournamentDto } from './Dtos/create-tournament.dto';
import { SetupTournamentDto } from './Dtos/setup-tournament.dto';
import { InviteMembersDto } from './Dtos/invite-members.dto';
import { RespondInvitationDto } from './Dtos/respond-invitation.dto';
import {
    TournamentApprovalStatus,
    TournamentAwardType,
    TournamentFormat,
    TournamentStatus,
} from '../common/Tournament.enum';
import { InvitationStatus, MemberRole, OrganizerApprovalStatus } from '../common/TournamentMember.enum';
import { DrawGateway } from '../draw/draw.gateway';
import { MatchStatus } from '../common/Match.enum';
import { UserRole } from '../common/User.enum';
import { AddGuestPlayerDto } from './Dtos/add-guest-player.dto';
import { UpdateMatchScoreDto } from './Dtos/update-match-score.dto';
import { TournamentApprovalDto } from './Dtos/tournament-approval.dto';
import { UpdateTournamentDetailsDto } from './Dtos/update-tournament-details.dto';


@Injectable()
export class TournamentService {
    constructor(
        @InjectRepository(Tournament) private tournaments: Repository<Tournament>,
        @InjectRepository(TournamentMember) private members: Repository<TournamentMember>,
        @InjectRepository(User) private users: Repository<User>,
        @InjectRepository(Match) private matches: Repository<Match>,
        @InjectRepository(Team) private teams: Repository<Team>,
        @InjectRepository(TournamentGroup) private groups: Repository<TournamentGroup>,
        @InjectRepository(TeamMember) private teamMembers: Repository<TeamMember>,
        private readonly drawGateway: DrawGateway,
    ) { }

    async findAll() {
        return this.tournaments.find({
            where: { approvalStatus: TournamentApprovalStatus.APPROVED },
            order: { startAt: 'ASC' },
        });
    }

    async findOwnedWithManagementSummary(organizerId: string) {
        const tournaments = await this.tournaments.find({
            where: { organizerId },
            order: { startAt: 'ASC' },
        });
        const ownedTournaments = tournaments;
        if (ownedTournaments.length === 0) return [];

        const tournamentIds = ownedTournaments.map(tournament => tournament.id);
        const members = await this.members.createQueryBuilder('member')
            .leftJoinAndSelect('member.user', 'user')
            .where('member.tournamentId IN (:...tournamentIds)', { tournamentIds })
            .orderBy('member.createdAt', 'ASC')
            .getMany();

        return ownedTournaments.map(tournament => {
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
                        tournament.approvalStatus === TournamentApprovalStatus.APPROVED &&
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
        if (typeof dto.name !== 'string' || typeof dto.location !== 'string') {
            throw new BadRequestException('Tên giải và địa điểm là bắt buộc');
        }
        if (typeof dto.startAt !== 'string' || (dto.endAt !== undefined && typeof dto.endAt !== 'string')) {
            throw new BadRequestException('Ngày bắt đầu hoặc ngày kết thúc không hợp lệ');
        }
        const startAt = new Date(dto.startAt);
        const endAt = dto.endAt ? new Date(dto.endAt) : null;
        if (Number.isNaN(startAt.getTime()) || (endAt && Number.isNaN(endAt.getTime()))) {
            throw new BadRequestException('Ngày bắt đầu hoặc ngày kết thúc không hợp lệ');
        }
        if (endAt && endAt < startAt) {
            throw new BadRequestException('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
        }
        const name = dto.name.trim();
        const location = dto.location.trim();
        if (!name || name.length > 160 || !location || location.length > 240) {
            throw new BadRequestException('Tên giải hoặc địa điểm không hợp lệ');
        }
        if (dto.description !== undefined && (
            typeof dto.description !== 'string' || dto.description.length > 5000
        )) {
            throw new BadRequestException('Mô tả không được vượt quá 5000 ký tự');
        }
        if (dto.coverImageUrl !== undefined && (
            typeof dto.coverImageUrl !== 'string' ||
            dto.coverImageUrl.length > 500 ||
            !/^\/uploads\/tournaments\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(dto.coverImageUrl)
        )) {
            throw new BadRequestException('Đường dẫn ảnh bìa không hợp lệ');
        }
        if (dto.awardTypes !== undefined && (
            !Array.isArray(dto.awardTypes) ||
            dto.awardTypes.length === 0 ||
            dto.awardTypes.some(type => !Object.values(TournamentAwardType).includes(type))
        )) {
            throw new BadRequestException('Phải chọn ít nhất một loại giải thưởng hợp lệ');
        }
        if (dto.qualifiersPerGroup !== undefined && ![2, 3].includes(dto.qualifiersPerGroup)) {
            throw new BadRequestException('Mỗi bảng chỉ có thể chọn 2 hoặc 3 đội vào vòng loại');
        }
        if (dto.bronzeMatchEnabled !== undefined && typeof dto.bronzeMatchEnabled !== 'boolean') {
            throw new BadRequestException('Tùy chọn trận tranh hạng 3 không hợp lệ');
        }
        for (const amount of [dto.feePerPlayer, dto.championPrizeMoney]) {
            if (amount !== undefined && (!Number.isSafeInteger(amount) || amount < 0 || amount > 2_000_000_000)) {
                throw new BadRequestException('Phí tham gia và tiền thưởng phải là số nguyên không âm hợp lệ');
            }
        }
        if (dto.contactLink !== undefined && typeof dto.contactLink !== 'string') {
            throw new BadRequestException('Link liên hệ không hợp lệ');
        }
        if (dto.contactLink?.trim()) {
            try {
                const contactUrl = new URL(dto.contactLink);
                if (!['http:', 'https:'].includes(contactUrl.protocol)) throw new Error();
            } catch {
                throw new BadRequestException('Link liên hệ không hợp lệ');
            }
        }
        if (
            !Array.isArray(dto.formatsDetail) ||
            dto.formatsDetail.length === 0 ||
            dto.formatsDetail.some(detail =>
                !detail ||
                !Object.values(TournamentFormat).includes(detail.format) ||
                !Number.isInteger(detail.maxPlayers) ||
                detail.maxPlayers < 2 ||
                detail.maxPlayers > 10000
            )
        ) {
            throw new BadRequestException('Nội dung thi đấu hoặc số lượng người chơi không hợp lệ');
        }
        const tournament = this.tournaments.create({
            name,
            location,
            coverImageUrl: dto.coverImageUrl?.trim() || null,
            description: dto.description?.trim() || null,
            startAt,
            endAt,
            awardTypes: dto.awardTypes ?? [],
            feePerPlayer: dto.feePerPlayer ?? 0,
            championPrizeMoney: dto.championPrizeMoney ?? 0,
            contactLink: dto.contactLink?.trim() || null,
            competition_Type: dto.competitionType,
            bracket_Type: dto.drawFormat ?? 'GROUP_AND_KNOCKOUT',
            qualifiersPerGroup: dto.qualifiersPerGroup ?? 2,
            bronzeMatchEnabled: dto.bronzeMatchEnabled ?? false,
            organizerId,
            approvalStatus: TournamentApprovalStatus.PENDING,
            formatDetails: dto.formatsDetail,
        });

        return await this.tournaments.save(tournament);
    }

    async listLocations() {
        const tournaments = await this.tournaments.find({ select: { location: true } });
        return [...new Set(
            tournaments
                .map(tournament => tournament.location?.trim())
                .filter((location): location is string => Boolean(location)),
        )].sort((a, b) => a.localeCompare(b, 'vi'));
    }

    async listPendingApprovals() {
        const tournaments = await this.tournaments.find({
            where: { approvalStatus: TournamentApprovalStatus.PENDING },
            order: { createdAt: 'ASC' },
        });
        const organizerIds = [...new Set(tournaments.map(tournament => tournament.organizerId))];
        const organizers = organizerIds.length
            ? await this.users.find({
                where: { id: In(organizerIds) },
                select: { id: true, fullName: true, email: true },
            })
            : [];
        return tournaments.map(tournament => ({
            ...tournament,
            organizer: organizers.find(organizer => organizer.id === tournament.organizerId) ?? null,
        }));
    }

    async decideTournamentApproval(
        tournamentId: string,
        adminId: string,
        dto: TournamentApprovalDto,
    ) {
        const tournament = await this.tournaments.findOne({ where: { id: tournamentId } });
        if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu');
        if (tournament.approvalStatus !== TournamentApprovalStatus.PENDING) {
            throw new BadRequestException('Giải đấu này đã được xử lý');
        }
        if (!Object.values(TournamentApprovalStatus).includes(dto.status)) {
            throw new BadRequestException('Trạng thái duyệt không hợp lệ');
        }
        if (dto.status === TournamentApprovalStatus.REJECTED && !dto.reason?.trim()) {
            throw new BadRequestException('Cần nhập lý do từ chối giải đấu');
        }
        tournament.approvalStatus = dto.status;
        tournament.approvedBy = adminId;
        tournament.approvedAt = new Date();
        tournament.rejectionReason = dto.status === TournamentApprovalStatus.REJECTED
            ? dto.reason!.trim()
            : null;
        return this.tournaments.save(tournament);
    }

    async resubmitTournament(tournamentId: string, organizerId: string) {
        const tournament = await this.getOwned(tournamentId, organizerId);
        if (tournament.approvalStatus !== TournamentApprovalStatus.REJECTED) {
            throw new BadRequestException('Chỉ có thể gửi lại giải đã bị từ chối');
        }
        tournament.approvalStatus = TournamentApprovalStatus.PENDING;
        tournament.approvedBy = null;
        tournament.approvedAt = null;
        tournament.rejectionReason = null;
        return this.tournaments.save(tournament);
    }

    async updateTournamentDetails(
        tournamentId: string,
        organizerId: string,
        dto: UpdateTournamentDetailsDto,
    ) {
        const tournament = await this.getOwned(tournamentId, organizerId);
        if (tournament.approvalStatus === TournamentApprovalStatus.APPROVED) {
            throw new ForbiddenException('Không thể sửa thông tin sau khi giải đã được duyệt');
        }
        if (dto.name !== undefined) {
            if (typeof dto.name !== 'string') throw new BadRequestException('Tên giải không hợp lệ');
            const name = dto.name.trim();
            if (!name || name.length > 160) throw new BadRequestException('Tên giải không hợp lệ');
            tournament.name = name;
        }
        if (dto.location !== undefined) {
            if (typeof dto.location !== 'string') throw new BadRequestException('Địa điểm không hợp lệ');
            const location = dto.location.trim();
            if (!location || location.length > 240) throw new BadRequestException('Địa điểm không hợp lệ');
            tournament.location = location;
        }
        if ((dto.startAt !== undefined && typeof dto.startAt !== 'string') ||
            (dto.endAt !== undefined && typeof dto.endAt !== 'string')) {
            throw new BadRequestException('Ngày bắt đầu hoặc ngày kết thúc không hợp lệ');
        }
        if (dto.startAt !== undefined) tournament.startAt = new Date(dto.startAt);
        if (dto.endAt !== undefined) tournament.endAt = new Date(dto.endAt);
        if (Number.isNaN(tournament.startAt.getTime()) ||
            (tournament.endAt && Number.isNaN(tournament.endAt.getTime()))) {
            throw new BadRequestException('Ngày bắt đầu hoặc ngày kết thúc không hợp lệ');
        }
        if (tournament.endAt && tournament.endAt < tournament.startAt) {
            throw new BadRequestException('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
        }
        if (dto.coverImageUrl !== undefined) {
            if (typeof dto.coverImageUrl !== 'string' ||
                (dto.coverImageUrl && !/^\/uploads\/tournaments\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(dto.coverImageUrl))) {
                throw new BadRequestException('Đường dẫn ảnh bìa không hợp lệ');
            }
            tournament.coverImageUrl = dto.coverImageUrl.trim() || null;
        }
        if (dto.description !== undefined) {
            if (typeof dto.description !== 'string' || dto.description.length > 5000) {
                throw new BadRequestException('Mô tả không được vượt quá 5000 ký tự');
            }
            tournament.description = dto.description.trim() || null;
        }
        if (dto.awardTypes !== undefined) {
            if (!Array.isArray(dto.awardTypes) ||
                dto.awardTypes.length === 0 ||
                dto.awardTypes.some(type => !Object.values(TournamentAwardType).includes(type))) {
                throw new BadRequestException('Loại giải thưởng không hợp lệ');
            }
            tournament.awardTypes = dto.awardTypes;
        }
        for (const amount of [dto.feePerPlayer, dto.championPrizeMoney]) {
            if (amount !== undefined && (!Number.isSafeInteger(amount) || amount < 0 || amount > 2_000_000_000)) {
                throw new BadRequestException('Phí tham gia và tiền thưởng phải là số nguyên không âm hợp lệ');
            }
        }
        if (dto.feePerPlayer !== undefined) tournament.feePerPlayer = dto.feePerPlayer;
        if (dto.championPrizeMoney !== undefined) tournament.championPrizeMoney = dto.championPrizeMoney;
        if (dto.contactLink !== undefined) {
            if (typeof dto.contactLink !== 'string') {
                throw new BadRequestException('Link liên hệ không hợp lệ');
            }
            if (dto.contactLink.trim()) {
                try {
                    const contactUrl = new URL(dto.contactLink);
                    if (!['http:', 'https:'].includes(contactUrl.protocol)) throw new Error();
                } catch {
                    throw new BadRequestException('Link liên hệ không hợp lệ');
                }
            }
            tournament.contactLink = dto.contactLink.trim() || null;
        }
        if (dto.qualifiersPerGroup !== undefined) {
            if (![2, 3].includes(dto.qualifiersPerGroup)) {
                throw new BadRequestException('Mỗi bảng chỉ có thể chọn 2 hoặc 3 đội vào vòng loại');
            }
            tournament.qualifiersPerGroup = dto.qualifiersPerGroup;
        }
        if (dto.bronzeMatchEnabled !== undefined) {
            if (typeof dto.bronzeMatchEnabled !== 'boolean') {
                throw new BadRequestException('Tùy chọn trận tranh hạng 3 không hợp lệ');
            }
            tournament.bronzeMatchEnabled = dto.bronzeMatchEnabled;
        }
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

        if (tournament.approvalStatus !== TournamentApprovalStatus.APPROVED) {
            throw new ForbiddenException('Giải đấu cần được admin duyệt trước khi mời thành viên');
        }
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
        const isValidRole = dto.role === MemberRole.PLAYER
            ? invitedUser.role === UserRole.PLAYER
            : [UserRole.PLAYER, UserRole.REFEREE].includes(invitedUser.role);
        if (!isValidRole) {
            throw new BadRequestException(
                dto.role === MemberRole.PLAYER
                    ? 'Chỉ có thể mời tài khoản vận động viên'
                    : 'Chỉ có thể bổ nhiệm tài khoản vận động viên làm trọng tài',
            );
        }

        const existingMember = await this.members.findOne({
            where: { tournamentId: id, userId: invitedUser.id },
        });
        if (existingMember) {
            if (existingMember.role !== dto.role) {
                if (dto.role !== MemberRole.REFEREE || existingMember.role !== MemberRole.PLAYER) {
                    throw new BadRequestException('Tài khoản đã được thêm vào giải với vai trò khác');
                }
                existingMember.role = MemberRole.REFEREE;
                existingMember.invitationStatus = InvitationStatus.PENDING;
                existingMember.organizerApprovalStatus = OrganizerApprovalStatus.PENDING;
                existingMember.respondedAt = null;
                await this.members.save(existingMember);
                tournament.status = TournamentStatus.INVITING;
                await this.tournaments.save(tournament);
                return this.summary(id, organizerId);
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
        if (tournament.approvalStatus !== TournamentApprovalStatus.APPROVED) {
            throw new ForbiddenException('Giải đấu cần được admin duyệt trước khi thêm vận động viên');
        }
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
        const hasValidRole = member.role === MemberRole.PLAYER
            ? userRole === UserRole.PLAYER
            : [UserRole.PLAYER, UserRole.REFEREE].includes(userRole as UserRole);
        if (!hasValidRole) {
            throw new ForbiddenException('Lời mời này không thuộc vai trò tài khoản của bạn');
        }

        if (member.invitationStatus !== InvitationStatus.PENDING) {
            throw new BadRequestException('You have already answered this invitation');
        }
        if (![InvitationStatus.ACCEPTED, InvitationStatus.DECLINED].includes(dto.status)) {
            throw new BadRequestException('Phản hồi lời mời chỉ được là ACCEPTED hoặc DECLINED');
        }
        if (
            dto.status === InvitationStatus.ACCEPTED &&
            member.role === MemberRole.PLAYER &&
            (
                !dto.playingHand ||
                !dto.preferredPosition ||
                !Array.isArray(dto.skills) ||
                dto.skills.length !== 4
            )
        ) {
            throw new BadRequestException('Vui lòng xác nhận tay thuận, vị trí và chọn đúng 4 kỹ năng trước khi nhận lời');
        }

        member.invitationStatus = dto.status;
        member.respondedAt = new Date();
        if (dto.status === InvitationStatus.ACCEPTED && member.role === MemberRole.PLAYER) {
            member.profileConfirmed = true;
        }
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

        if (
            organizerId &&
            tournament.approvalStatus !== TournamentApprovalStatus.APPROVED &&
            tournament.organizerId !== organizerId
        ) {
            const requester = await this.users.findOne({
                where: { id: organizerId },
                select: { id: true, role: true },
            });
            if (requester?.role !== UserRole.ADMIN) {
                throw new NotFoundException('Không tìm thấy giải đấu');
            }
        }

        if (organizerId && tournament.organizerId !== organizerId) {
            const requester = await this.users.findOne({
                where: { id: organizerId },
                select: { id: true, role: true },
            });
            if (requester?.role !== UserRole.ADMIN) {
                throw new ForbiddenException('Bạn không có quyền xem thông tin chi tiết quản lý của giải đấu này');
            }
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
                tournament.approvalStatus === TournamentApprovalStatus.APPROVED &&
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
        const tournaments = await this.tournaments.find({
            where: { approvalStatus: TournamentApprovalStatus.APPROVED },
            order: { startAt: 'ASC' },
        });

        const now = new Date();
        const liveMatches: any[] = [];
        const upcomingMatches: any[] = [];
        const liveTournaments: any[] = [];
        const upcomingTournaments: any[] = [];
        const members = tournaments.length
            ? await this.members.find({
                where: { tournamentId: In(tournaments.map(tournament => tournament.id)) },
            })
            : [];
        const toCard = (tournament: Tournament) => ({
            ...tournament,
            registeredPlayerCount: members.filter(member =>
                member.tournamentId === tournament.id &&
                member.role === MemberRole.PLAYER &&
                member.invitationStatus === InvitationStatus.ACCEPTED,
            ).length,
        });

        for (const t of tournaments) {
            if (!t.startAt) continue;
            if ([TournamentStatus.COMPLETED, TournamentStatus.CANCELLED].includes(t.status)) continue;

            const startDate = new Date(t.startAt);
            const endDate = t.endAt
                ? new Date(t.endAt)
                : new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59, 999);
            const activeMatch = await this.matches.findOne({
                where: { tournamentId: t.id, status: 'IN_PROGRESS' },
                order: { round: 'ASC', matchNumber: 'ASC' },
            });
            const isLive = t.status === TournamentStatus.IN_PROGRESS ||
                Boolean(activeMatch) ||
                (startDate <= now && endDate >= now);

            if (isLive) {
                liveTournaments.push(toCard(t));
                let currentMatch = activeMatch;

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
                upcomingTournaments.push(toCard(t));
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
            upcomingMatches,
            liveTournaments,
            upcomingTournaments,
        };
    }

    private async createKnockoutFixtures(tournament: Tournament) {
        const groups = await this.groups.find({
            where: { tournamentId: tournament.id },
            order: { position: 'ASC' },
        });
        const teams = await this.teams.find({ where: { tournamentId: tournament.id } });
        const groupMatches = await this.matches.find({
            where: { tournamentId: tournament.id, stage: 'GROUP' },
        });
        const qualified: Array<{ id: string; groupId: string }> = [];

        for (const group of groups) {
            const standings = teams
                .filter(team => team.groupId === group.id)
                .map(team => {
                    const stats = { id: team.id, groupId: group.id, wins: 0, scored: 0, conceded: 0 };
                    for (const groupMatch of groupMatches) {
                        if (
                            groupMatch.status !== 'COMPLETED' ||
                            (groupMatch.teamAId !== team.id && groupMatch.teamBId !== team.id)
                        ) continue;
                        const teamScore = groupMatch.teamAId === team.id ? groupMatch.scoreA : groupMatch.scoreB;
                        const opponentScore = groupMatch.teamAId === team.id ? groupMatch.scoreB : groupMatch.scoreA;
                        if (teamScore === null || opponentScore === null) continue;
                        stats.scored += teamScore;
                        stats.conceded += opponentScore;
                        if (teamScore > opponentScore) stats.wins += 1;
                    }
                    return stats;
                })
                .sort((a, b) =>
                    b.wins - a.wins ||
                    (b.scored - b.conceded) - (a.scored - a.conceded) ||
                    b.scored - a.scored ||
                    a.id.localeCompare(b.id),
                );
            qualified.push(...standings.slice(0, tournament.qualifiersPerGroup || 2));
        }

        if (qualified.length < 2) {
            throw new BadRequestException('Chưa đủ hai đội để tạo vòng loại trực tiếp');
        }

        for (let index = qualified.length - 1; index > 0; index--) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [qualified[index], qualified[randomIndex]] = [qualified[randomIndex], qualified[index]];
        }
        const paired: typeof qualified = [];
        while (qualified.length > 0) {
            const first = qualified.shift()!;
            if (qualified.length === 0) {
                paired.push(first);
                break;
            }
            const opponentIndex = qualified.findIndex(team => team.groupId !== first.groupId);
            paired.push(first, qualified.splice(opponentIndex >= 0 ? opponentIndex : 0, 1)[0]);
        }

        const bracketSize = 2 ** Math.ceil(Math.log2(paired.length));
        const rounds = Math.log2(bracketSize);
        const stages: Array<Array<{ teamAId: string | null; teamBId: string | null }>> = [];
        for (let round = 1; round <= rounds; round++) {
            stages.push(Array.from({ length: bracketSize / (2 ** round) }, () => ({
                teamAId: null,
                teamBId: null,
            })));
        }

        let qualifiedIndex = 0;
        const byeCount = bracketSize - paired.length;
        for (let index = 0; index < stages[0].length; index++) {
            const teamAId = paired[qualifiedIndex++]?.id ?? null;
            const teamBId = index < byeCount ? null : paired[qualifiedIndex++]?.id ?? null;
            if (teamAId && teamBId) {
                stages[0][index] = { teamAId, teamBId };
            } else if (teamAId && stages.length > 1) {
                const nextMatch = stages[1][Math.floor(index / 2)];
                if (index % 2 === 0) nextMatch.teamAId = teamAId;
                else nextMatch.teamBId = teamAId;
            }
        }

        const fixtures: Match[] = [];
        for (let roundIndex = 0; roundIndex < stages.length; roundIndex++) {
            stages[roundIndex].forEach((fixture, index) => {
                if (roundIndex > 0 || (fixture.teamAId && fixture.teamBId)) {
                    fixtures.push(this.matches.create({
                        tournamentId: tournament.id,
                        groupId: null,
                        stage: 'KNOCKOUT',
                        teamAId: fixture.teamAId,
                        teamBId: fixture.teamBId,
                        round: roundIndex + 1,
                        matchNumber: index + 1,
                        scoreA: null,
                        scoreB: null,
                        liveStreamUrl: null,
                        status: 'SCHEDULED',
                    }));
                }
            });
        }
        if (fixtures.length) await this.matches.save(fixtures);
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
        if (status === MatchStatus.IN_PROGRESS && (!match.teamAId || !match.teamBId)) {
            throw new BadRequestException('Trận đấu chưa xác định đủ hai đội');
        }
        if (
            status === MatchStatus.COMPLETED &&
            (
                match.scoreA === null ||
                match.scoreB === null ||
                match.scoreA === match.scoreB
            )
        ) {
            throw new BadRequestException('Cần có tỷ số hợp lệ và một đội thắng trước khi kết thúc trận');
        }

        match.status = status;
        if (scoreA !== undefined) match.scoreA = scoreA;
        if (scoreB !== undefined) match.scoreB = scoreB;

        const updatedMatch = await this.matches.save(match);
        const tournament = status === MatchStatus.COMPLETED
            ? await this.tournaments.findOne({
                where: { id: match.tournamentId },
                select: {
                    id: true,
                    bracket_Type: true,
                    qualifiersPerGroup: true,
                    bronzeMatchEnabled: true,
                },
            })
            : null;
        if (status === MatchStatus.COMPLETED && tournament?.bracket_Type === 'GROUP_AND_KNOCKOUT' && match.stage === 'GROUP') {
            const groupMatches = await this.matches.find({
                where: { tournamentId: match.tournamentId, stage: 'GROUP' },
            });
            if (groupMatches.length > 0 && groupMatches.every(groupMatch => groupMatch.status === MatchStatus.COMPLETED)) {
                const existingKnockoutMatches = await this.matches.find({
                    where: { tournamentId: match.tournamentId, stage: 'KNOCKOUT' },
                });
                if (existingKnockoutMatches.length === 0 && tournament) {
                    await this.createKnockoutFixtures(tournament);
                }
            }
        }
        const isLegacyEliminationMatch = tournament?.bracket_Type === 'SINGLE_ELIMINATION' && Boolean(match.groupId);
        const isKnockoutMatch = match.stage === 'KNOCKOUT' || isLegacyEliminationMatch;
        if (status === MatchStatus.COMPLETED && isKnockoutMatch && match.scoreA !== match.scoreB) {
            const nextMatch = await this.matches.findOne({
                where: {
                    tournamentId: match.tournamentId,
                    stage: 'KNOCKOUT',
                    round: match.round + 1,
                    matchNumber: Math.ceil(match.matchNumber / 2),
                },
            }) || (isLegacyEliminationMatch
                ? await this.matches.findOne({
                    where: {
                        tournamentId: match.tournamentId,
                        groupId: match.groupId ?? '',
                        round: match.round + 1,
                        matchNumber: Math.ceil(match.matchNumber / 2),
                    },
                })
                : null);
            if (nextMatch) {
                const winningTeamId = (match.scoreA ?? 0) > (match.scoreB ?? 0)
                    ? match.teamAId
                    : match.teamBId;
                if (match.matchNumber % 2 === 1) nextMatch.teamAId = winningTeamId;
                else nextMatch.teamBId = winningTeamId;
                const advancedMatch = await this.matches.save(nextMatch);
                this.drawGateway.server.to(`tournament_${match.tournamentId}`).emit('matchStatusUpdated', advancedMatch);
            }
        }
        if (
            status === MatchStatus.COMPLETED &&
            tournament?.bracket_Type === 'GROUP_AND_KNOCKOUT' &&
            tournament.bronzeMatchEnabled
        ) {
            const knockoutMatches = await this.matches.find({
                where: { tournamentId: match.tournamentId, stage: 'KNOCKOUT' },
            });
            const finalRound = Math.max(0, ...knockoutMatches.map(item => item.round));
            const semifinalMatches = knockoutMatches.filter(item => item.round === finalRound - 1);
            if (
                finalRound >= 2 &&
                match.round === finalRound - 1 &&
                semifinalMatches.length === 2 &&
                semifinalMatches.every(item => item.status === MatchStatus.COMPLETED)
            ) {
                const existingBronzeMatch = await this.matches.findOne({
                    where: { tournamentId: match.tournamentId, stage: 'BRONZE' },
                });
                if (!existingBronzeMatch) {
                    const losers = semifinalMatches.map(item =>
                        (item.scoreA ?? 0) < (item.scoreB ?? 0) ? item.teamAId : item.teamBId,
                    );
                    const bronzeMatch = await this.matches.save(this.matches.create({
                        tournamentId: match.tournamentId,
                        groupId: null,
                        stage: 'BRONZE',
                        teamAId: losers[0],
                        teamBId: losers[1],
                        round: finalRound + 1,
                        matchNumber: 1,
                        scoreA: null,
                        scoreB: null,
                        liveStreamUrl: null,
                        status: 'SCHEDULED',
                    }));
                    this.drawGateway.server.to(`tournament_${match.tournamentId}`).emit('matchStatusUpdated', bronzeMatch);
                }
            }
        }

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
        const membership = await this.members.findOne({
            where: {
                tournamentId,
                userId,
                role: MemberRole.REFEREE,
                invitationStatus: InvitationStatus.ACCEPTED,
            },
        });
        if (membership) return;
        throw new ForbiddenException('Bạn không có quyền điều khiển trận đấu');
    }

    async getTournamentMatches(tournamentId: string, requesterId: string) {
        const tournament = await this.tournaments.findOne({
            where: { id: tournamentId }
        });

        if (!tournament) {
            throw new NotFoundException('Tournament not found');
        }
        const requester = await this.users.findOne({
            where: { id: requesterId },
            select: { id: true, role: true },
        });
        if (
            tournament.approvalStatus !== TournamentApprovalStatus.APPROVED &&
            tournament.organizerId !== requesterId &&
            requester?.role !== UserRole.ADMIN
        ) {
            throw new NotFoundException('Tournament not found');
        }

        const tournamentMatches = await this.matches.find({
            where: { tournamentId },
            order: { round: 'ASC', matchNumber: 'ASC' }
        });

        const teams = await this.teams.find({
            where: { tournamentId }
        });
        const groups = await this.groups.find({
            where: { tournamentId },
            order: { position: 'ASC' },
        });
        const teamMembers = teams.length
            ? await this.teamMembers.find({ where: { teamId: In(teams.map(team => team.id)) } })
            : [];
        const teamMemberIds = teamMembers
            .map(member => member.tournamentMemberId)
            .filter((id): id is string => Boolean(id));
        const tournamentMembers = teamMemberIds.length
            ? await this.members.find({
                where: { id: In(teamMemberIds) },
                relations: { user: true },
            })
            : [];
        const teamUserIds = [...new Set(teamMembers.map(member => member.userId).filter((id): id is string => Boolean(id)))];
        const teamUsers = teamUserIds.length
            ? await this.users.find({
                where: { id: In(teamUserIds) },
                select: { id: true, fullName: true },
            })
            : [];
        const organizer = await this.users.findOne({
            where: { id: tournament.organizerId },
            select: { id: true, fullName: true },
        });
        const playerMembers = await this.members.find({
            where: { tournamentId, role: MemberRole.PLAYER },
            relations: { user: true },
            order: { createdAt: 'ASC' },
        });
        const refereeMembership = await this.members.findOne({
            where: {
                tournamentId,
                userId: requesterId,
                role: MemberRole.REFEREE,
                invitationStatus: InvitationStatus.ACCEPTED,
            },
        });
        const canManageMatches = tournament.organizerId === requesterId ||
            Boolean(refereeMembership);
        const now = new Date();
        const tournamentEndAt = tournament.endAt
            ? new Date(tournament.endAt)
            : new Date(tournament.startAt.getFullYear(), tournament.startAt.getMonth(), tournament.startAt.getDate(), 23, 59, 59, 999);
        const isLive = ![TournamentStatus.COMPLETED, TournamentStatus.CANCELLED].includes(tournament.status) &&
            (tournament.status === TournamentStatus.IN_PROGRESS ||
                tournamentMatches.some(match => match.status === 'IN_PROGRESS') ||
                (tournament.startAt <= now && tournamentEndAt >= now));

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
        const knockoutFinalRound = Math.max(
            0,
            ...tournamentMatches
                .filter(match => match.stage === 'KNOCKOUT' ||
                    (tournament.bracket_Type === 'SINGLE_ELIMINATION' && match.stage === 'GROUP'))
                .map(match => match.round),
        );
        const describeMatchRound = (match: Match) => {
            if (match.stage === 'BRONZE') return 'Tranh hạng 3';
            if (match.stage === 'KNOCKOUT' || tournament.bracket_Type === 'SINGLE_ELIMINATION') {
                if (match.round === knockoutFinalRound) return 'Chung kết';
                if (match.round === knockoutFinalRound - 1) return 'Bán kết';
                if (match.round === knockoutFinalRound - 2) return 'Tứ kết';
                return `Vòng ${match.round}`;
            }
            const group = groups.find(item => item.id === match.groupId);
            return `${group?.name || 'Vòng bảng'} · Vòng ${match.round}`;
        };

        return {
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            tournament: {
                id: tournament.id,
                name: tournament.name,
                location: tournament.location,
                coverImageUrl: tournament.coverImageUrl,
                description: tournament.description,
                startAt: tournament.startAt,
                endAt: tournament.endAt,
                awardTypes: tournament.awardTypes,
                formatDetails: tournament.formatDetails,
                feePerPlayer: tournament.feePerPlayer,
                championPrizeMoney: tournament.championPrizeMoney,
                contactLink: tournament.contactLink,
                status: tournament.status,
                isLive,
                bracket_Type: tournament.bracket_Type,
                qualifiersPerGroup: tournament.qualifiersPerGroup,
                bronzeMatchEnabled: tournament.bronzeMatchEnabled,
                organizerName: organizer?.fullName || 'Ban tổ chức',
            },
            canManageMatches,
            groups: groups.map(group => ({
                id: group.id,
                name: group.name,
                position: group.position,
                teams: teams.filter(team => team.groupId === group.id).map(team => ({
                    id: team.id,
                    name: team.name,
                    members: teamMembers
                        .filter(member => member.teamId === team.id)
                        .map(member => {
                            const registration = tournamentMembers.find(item => item.id === member.tournamentMemberId);
                            const user = teamUsers.find(item => item.id === member.userId);
                            return { fullName: registration?.guestFullName || registration?.user?.fullName || user?.fullName || 'VĐV' };
                        }),
                })),
            })),
            teams: teams.map(team => ({
                id: team.id,
                name: team.name,
                groupId: team.groupId,
            })),
            playerRegistrations: {
                approved: approvedPlayers.map(mapPlayer),
                awaitingApproval: awaitingApprovalPlayers.map(mapPlayer),
                awaitingResponse: awaitingResponsePlayers.map(mapPlayer),
                rejected: rejectedPlayers.map(mapPlayer),
            },
            matches: tournamentMatches.map(m => ({
                id: m.id,
                teamAId: m.teamAId,
                teamBId: m.teamBId,
                round: describeMatchRound(m),
                teamA: m.teamAId ? teamMap.get(m.teamAId) || 'Đội chưa xác định' : 'Chờ xác định',
                teamB: m.teamBId ? teamMap.get(m.teamBId) || 'Đội chưa xác định' : 'Chờ xác định',
                score: m.scoreA !== null && m.scoreB !== null ? `${m.scoreA} - ${m.scoreB}` : 'VS',
                scoreA: m.scoreA,
                scoreB: m.scoreB,
                liveStreamUrl: m.liveStreamUrl,
                rawStatus: m.status,
                groupId: m.groupId,
                stage: m.stage === 'KNOCKOUT' || tournament.bracket_Type === 'SINGLE_ELIMINATION'
                    ? 'KNOCKOUT'
                    : m.stage,
                status: m.status === 'IN_PROGRESS' ? 'Đang diễn ra' : m.status === 'COMPLETED' ? 'Đã kết thúc' : 'Sắp diễn ra',
            }))
        };
    }
}
