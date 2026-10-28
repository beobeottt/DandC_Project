import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PickleballSkill } from '../common/player-skill.enum';
import { InvitationStatus, MemberRole, OrganizerApprovalStatus } from '../common/TournamentMember.enum';
import { TournamentApprovalStatus } from '../common/Tournament.enum';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { Tournament } from '../tournament/Entities/tounament.entity';
import { User } from '../user/Entities/user.entity';
import { CreatePracticeSessionDto } from './Dtos/create-practice-session.dto';
import { PracticeSession } from './Entities/practice-session.entity';

@Injectable()
export class PracticeService {
  constructor(
    @InjectRepository(PracticeSession)
    private readonly sessions: Repository<PracticeSession>,
    @InjectRepository(Tournament)
    private readonly tournaments: Repository<Tournament>,
    @InjectRepository(TournamentMember)
    private readonly members: Repository<TournamentMember>,
  ) {}

  async listOrganizerTournaments(organizerId: string) {
    return this.tournaments.find({
      where: {
        organizerId,
        approvalStatus: TournamentApprovalStatus.APPROVED,
      },
      order: { startAt: 'ASC' },
      select: { id: true, name: true, startAt: true },
    });
  }

  async listTournamentPlayers(tournamentId: string, organizerId: string) {
    await this.getApprovedOwnedTournament(tournamentId, organizerId);
    const members = await this.members.find({
      where: {
        tournamentId,
        role: MemberRole.PLAYER,
        invitationStatus: InvitationStatus.ACCEPTED,
        organizerApprovalStatus: OrganizerApprovalStatus.APPROVED,
      },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    return members
      .filter((member): member is TournamentMember & { user: User } => Boolean(member.userId && member.user))
      .map(member => ({
        id: member.user.id,
        fullName: member.user.fullName,
        level: member.user.level,
      }));
  }

  async createSession(organizerId: string, dto: CreatePracticeSessionDto) {
    await this.getApprovedOwnedTournament(dto.tournamentId, organizerId);
    const member = await this.members.findOne({
      where: {
        tournamentId: dto.tournamentId,
        userId: dto.playerId,
        role: MemberRole.PLAYER,
        invitationStatus: InvitationStatus.ACCEPTED,
        organizerApprovalStatus: OrganizerApprovalStatus.APPROVED,
      },
    });
    if (!member) {
      throw new ForbiddenException('Chỉ có thể ghi practice cho VĐV đã được duyệt trong giải của bạn');
    }

    const focus = typeof dto.focus === 'string' ? dto.focus.trim() : '';
    const practiceDate = new Date(dto.practiceDate);
    if (!focus || focus.length > 120) {
      throw new BadRequestException('Nội dung practice không được để trống và tối đa 120 ký tự');
    }
    if (!Number.isInteger(dto.durationMinutes) || dto.durationMinutes < 1 || dto.durationMinutes > 1440) {
      throw new BadRequestException('Thời lượng practice phải từ 1 đến 1440 phút');
    }
    if (Number.isNaN(practiceDate.getTime())) {
      throw new BadRequestException('Ngày practice không hợp lệ');
    }
    if (!Array.isArray(dto.skillMetrics) || dto.skillMetrics.length === 0) {
      throw new BadRequestException('Chọn ít nhất một kỹ năng và nhập kết quả tập luyện');
    }

    const seenSkills = new Set<PickleballSkill>();
    for (const metric of dto.skillMetrics) {
      if (!Object.values(PickleballSkill).includes(metric.skill) || seenSkills.has(metric.skill)) {
        throw new BadRequestException('Danh sách kỹ năng không hợp lệ hoặc bị trùng');
      }
      if (
        !Number.isInteger(metric.attempts) ||
        !Number.isInteger(metric.successes) ||
        metric.attempts < 1 ||
        metric.successes < 0 ||
        metric.successes > metric.attempts
      ) {
        throw new BadRequestException('Số lần thành công phải nằm trong khoảng từ 0 đến số lần thực hiện');
      }
      seenSkills.add(metric.skill);
    }

    return this.sessions.save(this.sessions.create({
      tournamentId: dto.tournamentId,
      playerId: dto.playerId,
      organizerId,
      focus,
      location: dto.location?.trim() || null,
      durationMinutes: dto.durationMinutes,
      practiceDate,
      skillMetrics: dto.skillMetrics,
    }));
  }

  async getPlayerHistory(playerId: string) {
    const sessions = await this.sessions.find({
      where: { playerId },
      relations: { tournament: true, organizer: true },
      order: { practiceDate: 'DESC', createdAt: 'DESC' },
    });
    const totals = new Map<PickleballSkill, { attempts: number; successes: number }>();
    for (const session of sessions) {
      for (const metric of session.skillMetrics) {
        const total = totals.get(metric.skill) ?? { attempts: 0, successes: 0 };
        total.attempts += metric.attempts;
        total.successes += metric.successes;
        totals.set(metric.skill, total);
      }
    }
    return {
      skillSummary: [...totals.entries()].map(([skill, total]) => ({
        skill,
        ...total,
        successRate: Math.round((total.successes / total.attempts) * 100),
      })),
      sessions: sessions.map(session => ({
        id: session.id,
        tournamentId: session.tournamentId,
        tournamentName: session.tournament?.name || 'Giải đấu',
        organizerName: session.organizer?.fullName || 'Ban tổ chức',
        focus: session.focus,
        location: session.location,
        durationMinutes: session.durationMinutes,
        practiceDate: session.practiceDate,
        skillMetrics: session.skillMetrics.map(metric => ({
          ...metric,
          successRate: Math.round((metric.successes / metric.attempts) * 100),
        })),
      })),
    };
  }

  private async getApprovedOwnedTournament(tournamentId: string, organizerId: string) {
    const tournament = await this.tournaments.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu');
    if (tournament.organizerId !== organizerId) {
      throw new ForbiddenException('Bạn không có quyền ghi practice cho giải đấu này');
    }
    if (tournament.approvalStatus !== TournamentApprovalStatus.APPROVED) {
      throw new ForbiddenException('Chỉ có thể ghi practice trong giải đã được admin duyệt');
    }
    return tournament;
  }
}
