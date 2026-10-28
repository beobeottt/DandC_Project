import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './Entities/user.entity';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { Tournament } from '../tournament/Entities/tounament.entity';
import { TeamMember } from '../draw/Entities/teamMember.entity';
import { UpdatePlayerSkillsDto } from './Dtos/update-player-skills.dto';
import { UpdateUserProfileDto } from './Dtos/update-user-profile.dto';
import { CreateAccountDto } from './Dtos/create-account.dto';
import { OrganizerApprovalDto } from './Dtos/organizer-approval.dto';
import { OrganizerApprovalStatus } from '../common/TournamentMember.enum';
import { UserRole } from '../common/User.enum';
import { Match } from '../draw/Entities/match.entity';
import { Team } from '../draw/Entities/team.entity';
import { PlayerLevelHistory } from './Entities/player-level-history.entity';
import { UpdatePlayerLevelDto } from './Dtos/update-player-level.dto';
import { MatchStatus } from '../common/Match.enum';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(TournamentMember)
    private readonly memberRepository: Repository<TournamentMember>,
    @InjectRepository(Tournament)
    private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(PlayerLevelHistory)
    private readonly playerLevelHistoryRepository: Repository<PlayerLevelHistory>,
  ) {}

  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email && !password) return;
    if (!email || !password || password.length < 8) {
      throw new Error('Set both ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters to bootstrap admin');
    }

    const existingAdmin = await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });
    if (existingAdmin) {
      if (existingAdmin.role === UserRole.ADMIN) return;
      if (!(await bcrypt.compare(password, existingAdmin.passwordHash))) {
        throw new Error('ADMIN_EMAIL belongs to an existing account; ADMIN_PASSWORD must match that account to promote it');
      }
      await this.userRepository.update(existingAdmin.id, {
        role: UserRole.ADMIN,
        requestedRole: UserRole.ADMIN,
        organizerApprovalStatus: null,
      });
      return;
    }

    await this.userRepository.save(this.userRepository.create({
      email,
      fullName: 'System Administrator',
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.ADMIN,
      requestedRole: UserRole.ADMIN,
    }));
  }

  async listAccounts() {
    const accounts = await this.userRepository.find({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        requestedRole: true,
        organizerApprovalStatus: true,
        level: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });
    return accounts;
  }

  async createAccount(dto: CreateAccountDto) {
    if (![UserRole.PLAYER, UserRole.ORGANIZER, UserRole.ADMIN].includes(dto.role)) {
      throw new BadRequestException('Vai trò tài khoản không hợp lệ');
    }
    if (
      !dto.fullName?.trim() ||
      dto.fullName.trim().length > 120 ||
      !dto.email?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email.trim()) ||
      !dto.password ||
      dto.password.length < 8
    ) {
      throw new BadRequestException('Họ tên, email và mật khẩu tối thiểu 8 ký tự là bắt buộc');
    }
    const email = dto.email.trim().toLowerCase();
    if (await this.userRepository.findOne({ where: { email } })) {
      throw new ConflictException('Email này đã được sử dụng');
    }
    const role = dto.role;
    const saved = await this.userRepository.save(this.userRepository.create({
      email,
      fullName: dto.fullName.trim(),
      passwordHash: await bcrypt.hash(dto.password, 10),
      role,
      requestedRole: role,
      organizerApprovalStatus: role === UserRole.ORGANIZER
        ? OrganizerApprovalStatus.APPROVED
        : null,
    }));
    const { passwordHash: _passwordHash, ...safeAccount } = saved;
    return safeAccount;
  }

  async decideOrganizerRequest(userId: string, dto: OrganizerApprovalDto) {
    if (![OrganizerApprovalStatus.APPROVED, OrganizerApprovalStatus.REJECTED].includes(dto.status)) {
      throw new BadRequestException('Trạng thái duyệt không hợp lệ');
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.requestedRole !== UserRole.ORGANIZER) {
      throw new NotFoundException('Không tìm thấy yêu cầu tài khoản Ban tổ chức');
    }
    if (user.organizerApprovalStatus !== OrganizerApprovalStatus.PENDING) {
      throw new BadRequestException('Yêu cầu này đã được xử lý');
    }
    user.organizerApprovalStatus = dto.status;
    if (dto.status === OrganizerApprovalStatus.APPROVED) {
      user.role = UserRole.ORGANIZER;
    }
    const saved = await this.userRepository.save(user);
    const { passwordHash: _passwordHash, ...safeAccount } = saved;
    return safeAccount;
  }

  async deleteAccount(userId: string, adminId: string) {
    if (userId === adminId) {
      throw new BadRequestException('Không thể xóa tài khoản admin đang đăng nhập');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.userRepository.count({ where: { role: UserRole.ADMIN } });
      if (adminCount <= 1) {
        throw new BadRequestException('Không thể xóa admin cuối cùng');
      }
    }

    const memberships = await this.memberRepository.find({
      where: { userId },
      select: { id: true },
    });
    const memberIds = memberships.map(member => member.id);
    await this.userRepository.manager.transaction(async manager => {
      const teamMembers = manager.getRepository(TeamMember);
      if (memberIds.length > 0) {
        await teamMembers.createQueryBuilder()
          .update(TeamMember)
          .set({ tournamentMemberId: null })
          .where('tournamentMemberId IN (:...memberIds)', { memberIds })
          .execute();
      }
      await teamMembers.update({ userId }, { userId: null });
      await manager.getRepository(Tournament).update(
        { organizerId: userId },
        { organizerId: adminId },
      );
      await manager.getRepository(TournamentMember).delete({ userId });
      await manager.getRepository(User).delete({ id: userId });
    });
    return { message: 'Đã xóa tài khoản' };
  }

  async listPlayerRatings() {
    return this.userRepository.find({
      where: { role: UserRole.PLAYER },
      select: { id: true, fullName: true, email: true, level: true },
      order: { fullName: 'ASC' },
    });
  }

  async getPlayerRatingHistory(playerId: string) {
    const player = await this.userRepository.findOne({
      where: { id: playerId },
      select: { id: true, fullName: true, email: true, role: true, level: true },
    });
    if (!player || player.role !== UserRole.PLAYER) {
      throw new NotFoundException('Không tìm thấy vận động viên');
    }

    const histories = await this.playerLevelHistoryRepository.find({
      where: { playerId },
      order: { changedAt: 'DESC' },
    });

    return {
      player,
      matches: await this.getCompletedMatchHistory(playerId),
      levelHistory: histories,
    };
  }

  async getMyMatchHistory(playerId: string) {
    return this.getCompletedMatchHistory(playerId);
  }

  async updatePlayerLevel(playerId: string, adminId: string, dto: UpdatePlayerLevelDto) {
    const reason = typeof dto.reason === 'string' ? dto.reason.trim() : '';
    if (
      !Number.isFinite(dto.level) ||
      Math.round(dto.level * 10) !== dto.level * 10 ||
      dto.level < 1 ||
      dto.level > 6 ||
      reason.length < 5 ||
      reason.length > 500
    ) {
      throw new BadRequestException('Điểm trình phải từ 1.0 đến 6.0 (bước 0.1) và cần nhập lý do từ 5 đến 500 ký tự');
    }

    return this.userRepository.manager.transaction(async manager => {
      const userRepository = manager.getRepository(User);
      const historyRepository = manager.getRepository(PlayerLevelHistory);
      const player = await userRepository.findOne({ where: { id: playerId } });
      if (!player || player.role !== UserRole.PLAYER) {
        throw new NotFoundException('Không tìm thấy vận động viên');
      }
      if (player.level === dto.level) {
        throw new BadRequestException('Điểm trình mới giống điểm hiện tại');
      }
      await historyRepository.save(historyRepository.create({
        playerId,
        adminId,
        previousLevel: player.level,
        newLevel: dto.level,
        reason,
      }));
      player.level = dto.level;
      return userRepository.save(player);
    });
  }

  private async getCompletedMatchHistory(playerId: string) {
    const rosterEntries = await this.teamMemberRepository.find({ where: { userId: playerId } });
    const playerTeamIds = new Set(rosterEntries.map(entry => entry.teamId));
    if (playerTeamIds.size === 0) return [];

    const matches = await this.matchRepository.find({
      where: [
        { teamAId: In([...playerTeamIds]), status: MatchStatus.COMPLETED },
        { teamBId: In([...playerTeamIds]), status: MatchStatus.COMPLETED },
      ],
    });
    const matchTeamIds = [...new Set(matches.flatMap(match =>
      [match.teamAId, match.teamBId].filter((teamId): teamId is string => Boolean(teamId)),
    ))];
    const teams = matchTeamIds.length
      ? await this.teamRepository.find({ where: { id: In(matchTeamIds) } })
      : [];
    const teamMembers = matchTeamIds.length
      ? await this.teamMemberRepository.find({ where: { teamId: In(matchTeamIds) } })
      : [];
    const playerIds = [...new Set(teamMembers.map(member => member.userId).filter((id): id is string => Boolean(id)))];
    const players = playerIds.length
      ? await this.userRepository.find({
          where: { id: In(playerIds) },
          select: { id: true, fullName: true },
        })
      : [];
    const tournamentIds = [...new Set(matches.map(match => match.tournamentId))];
    const tournaments = tournamentIds.length
      ? await this.tournamentRepository.find({ where: { id: In(tournamentIds) } })
      : [];

    return matches.map(match => {
      const playerTeamId = match.teamAId && playerTeamIds.has(match.teamAId)
        ? match.teamAId
        : match.teamBId;
      const opponentTeamId = playerTeamId === match.teamAId ? match.teamBId : match.teamAId;
      const isTeamA = playerTeamId === match.teamAId;
      const myScore = isTeamA ? match.scoreA : match.scoreB;
      const opponentScore = isTeamA ? match.scoreB : match.scoreA;
      const opponentMemberIds = teamMembers
        .filter(member => member.teamId === opponentTeamId)
        .map(member => member.userId)
        .filter((id): id is string => Boolean(id));
      const tournament = tournaments.find(item => item.id === match.tournamentId);
      return {
        id: match.id,
        tournamentName: tournament?.name ?? 'Giải đấu',
        tournamentDate: tournament?.startAt ?? null,
        round: match.round,
        teamA: teams.find(team => team.id === match.teamAId)?.name ?? 'Đội',
        teamB: teams.find(team => team.id === match.teamBId)?.name ?? 'Đội',
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        myScore,
        opponentScore,
        opponent: opponentMemberIds
          .map(id => players.find(player => player.id === id)?.fullName)
          .filter((name): name is string => Boolean(name))
          .join(' - ') || teams.find(team => team.id === opponentTeamId)?.name || 'Đối thủ',
        result: (myScore ?? 0) > (opponentScore ?? 0) ? 'WIN' : 'LOSS',
      };
    }).sort((first, second) =>
      new Date(second.tournamentDate || 0).getTime() - new Date(first.tournamentDate || 0).getTime(),
    );
  }

  async getProfile(userId: string) {

    if(!userId) {
      throw new BadRequestException('User ID is required');
    }
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toProfileResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: dto.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email is already in use');
      }
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    const savedUser = await this.userRepository.save(user);

    return this.toProfileResponse(savedUser);
  }

  async updatePlayerSkills(userId: string, dto: UpdatePlayerSkillsDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.playingHand !== undefined) user.playingHand = dto.playingHand;
    if (dto.preferredPosition !== undefined) user.preferredPosition = dto.preferredPosition;
    if (dto.skills !== undefined) user.skills = dto.skills;
    const savedUser = await this.userRepository.save(user);

    return this.toProfileResponse(savedUser);
  }

  async getMyInvitations(userId: string) {
    return this.memberRepository.find({
      where: { userId },
      relations: 
      {
        tournament: true,
      },
      order: { createdAt: 'DESC' }, 
    });
  }

  private toProfileResponse(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      requestedRole: user.requestedRole,
      organizerApprovalStatus: user.organizerApprovalStatus,
      level: user.level,
      playingHand: user.playingHand,
      preferredPosition: user.preferredPosition,
      skills: user.skills,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
