import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerateDrawDto } from './Dtos/generate-draw.dto';
import { DrawGateway } from './draw.gateway';
import { In } from 'typeorm';
import { Team } from './Entities/team.entity';
import { TeamMember } from './Entities/teamMember.entity';
import { Match } from './Entities/match.entity';
import { TournamentGroup } from './Entities/group.entity';
import { Tournament } from '../tournament/Entities/tounament.entity';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { InvitationStatus, MemberRole, OrganizerApprovalStatus } from '../common/TournamentMember.enum';
import { TournamentApprovalStatus } from '../common/Tournament.enum';

@Injectable()
export class DrawService {
  constructor(
    @InjectRepository(Team) private readonly teamRepository: Repository<Team>,
    @InjectRepository(TournamentGroup) private readonly groupRepository: Repository<TournamentGroup>,
    @InjectRepository(Tournament) private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentMember) private readonly tournamentMemberRepository: Repository<TournamentMember>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(TeamMember) private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Match) private readonly matchRepository: Repository<Match>,
    private readonly drawGateway: DrawGateway,
  ) {}

  async generateDraw(tournamentId: string, organizerId: string, dto: GenerateDrawDto) {
    const { malesPerTeam, femalesPerTeam, teamsPerGroup } = dto;
    const playersPerTeam = malesPerTeam + femalesPerTeam;

    if (playersPerTeam <= 0) {
      throw new BadRequestException('Một đội phải có ít nhất 1 thành viên');
    }

    const tournament = await this.tournamentRepository.findOne({ where: { id: tournamentId } });
    if (!tournament) {
      throw new BadRequestException('Giải đấu không hợp lệ hoặc bạn không có quyền');
    }
    if (tournament.organizerId !== organizerId) {
      throw new ForbiddenException('Bạn không có quyền bốc thăm giải đấu này');
    }
    if (tournament.drawLocked) {
      throw new BadRequestException('Giải đấu đã được bốc thăm');
    }
    if (tournament.approvalStatus !== TournamentApprovalStatus.APPROVED) {
      throw new ForbiddenException('Giải đấu cần được admin duyệt trước khi bốc thăm');
    }
    const allPlayers = await this.tournamentMemberRepository.find({
      where: { tournamentId, role: MemberRole.PLAYER },
    });

    // Đã đổi thành this.tournamentMemberRepository
    const players = await this.tournamentMemberRepository.find({
      where: {
        tournamentId,
        role: MemberRole.PLAYER,
        invitationStatus: InvitationStatus.ACCEPTED,
        organizerApprovalStatus: OrganizerApprovalStatus.APPROVED,
      },
    });

    if (players.length === 0) {
      throw new BadRequestException('Không có vận động viên nào để bốc thăm');
    }
    const confirmationRate = allPlayers.length
      ? Math.floor((players.length / allPlayers.length) * 100)
      : 0;
    if (confirmationRate < tournament.confirmation_Threshold) {
      throw new BadRequestException(
        `Chỉ bốc thăm khi tỷ lệ VĐV đã xác nhận và được duyệt đạt ${tournament.confirmation_Threshold}% (hiện tại ${confirmationRate}%)`,
      );
    }

    const malePlayers = players.filter(p => p.gender?.toLowerCase() === 'nam' || p.gender?.toLowerCase() === 'male');
    const femalePlayers = players.filter(p => p.gender?.toLowerCase() === 'nữ' || p.gender?.toLowerCase() === 'female');
    const unclassifiedPlayers = players.filter(p =>
      !malePlayers.includes(p) && !femalePlayers.includes(p),
    );

    const shuffleArray = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    };
    
    shuffleArray(malePlayers);
    shuffleArray(femalePlayers);
    shuffleArray(unclassifiedPlayers);

    const playersPerGroup = playersPerTeam * teamsPerGroup;
    const numberOfGroups = Math.ceil(players.length / playersPerGroup);

    let maleIndex = 0;
    let femaleIndex = 0;
    let unclassifiedIndex = 0;
    let globalTeamCount = 0;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let g = 0; g < numberOfGroups; g++) {
      const group = await this.groupRepository.save(
        this.groupRepository.create({
          tournamentId,
          name: tournament.bracket_Type === 'SINGLE_ELIMINATION' ? `Nhánh ${g + 1}` : `Bảng ${g + 1}`,
          position: g + 1,
        })
      );

      for (let t = 0; t < teamsPerGroup; t++) {
        if (
          maleIndex >= malePlayers.length &&
          femaleIndex >= femalePlayers.length &&
          unclassifiedIndex >= unclassifiedPlayers.length
        ) break;

        const letter = alphabet[globalTeamCount % 26];
        const suffix = Math.floor(globalTeamCount / 26) > 0 ? Math.floor(globalTeamCount / 26) : '';

        const newTeam = await this.teamRepository.save(
          this.teamRepository.create({ tournamentId, groupId: group.id, name: `Đội ${letter}${suffix}` })
        );
        globalTeamCount++;

        const teamMembersToSave: TeamMember[] = [];

        for (let m = 0; m < malesPerTeam; m++) {
          if (maleIndex < malePlayers.length) {

            const player = malePlayers[maleIndex];
            teamMembersToSave.push(this.teamMemberRepository.create({
              teamId: newTeam.id,
              userId: player.userId,
              tournamentMemberId: player.id,
            }));
            maleIndex++;
          }
        }

        for (let f = 0; f < femalesPerTeam; f++) {
          if (femaleIndex < femalePlayers.length) {
            const player = femalePlayers[femaleIndex];
            teamMembersToSave.push(this.teamMemberRepository.create({
              teamId: newTeam.id,
              userId: player.userId,
              tournamentMemberId: player.id,
            }));
            femaleIndex++;
          }
        }

        while (teamMembersToSave.length < playersPerTeam && unclassifiedIndex < unclassifiedPlayers.length) {
          const player = unclassifiedPlayers[unclassifiedIndex++];
          teamMembersToSave.push(this.teamMemberRepository.create({
            teamId: newTeam.id,
            userId: player.userId,
            tournamentMemberId: player.id,
          }));
        }

        while (
          teamMembersToSave.length < playersPerTeam &&
          (maleIndex < malePlayers.length || femaleIndex < femalePlayers.length)
        ) {
          const player = maleIndex < malePlayers.length
            ? malePlayers[maleIndex++]
            : femalePlayers[femaleIndex++];
          teamMembersToSave.push(this.teamMemberRepository.create({
            teamId: newTeam.id,
            userId: player.userId,
            tournamentMemberId: player.id,
          }));
        }

        if (teamMembersToSave.length > 0) {

          await this.teamMemberRepository.save(teamMembersToSave);
        }
      }
    }

    const createdGroups = await this.groupRepository.find({
      where: { tournamentId },
      order: { position: 'ASC' },
    });
    const createdTeams = await this.teamRepository.find({ where: { tournamentId } });
    const fixtures: Match[] = [];
    for (const group of createdGroups) {
      const groupTeams = createdTeams.filter(team => team.groupId === group.id);
      if (tournament.bracket_Type === 'SINGLE_ELIMINATION') {
        if (groupTeams.length < 2) continue;
        const rounds = Math.ceil(Math.log2(groupTeams.length));
        const bracketSize = 2 ** rounds;
        const stages: Array<Array<{ groupId: string; round: number; matchNumber: number; teamAId: string | null; teamBId: string | null }>> = [];
        for (let round = 1; round <= rounds; round++) {
          const matchCount = bracketSize / (2 ** round);
          stages.push(Array.from({ length: matchCount }, (_, index) => ({
            groupId: group.id,
            round,
            matchNumber: index + 1,
            teamAId: round === 1 ? groupTeams[index * 2]?.id ?? null : null,
            teamBId: round === 1 ? groupTeams[index * 2 + 1]?.id ?? null : null,
          })));
        }
        for (let stageIndex = 0; stageIndex < stages.length - 1; stageIndex++) {
          stages[stageIndex].forEach((match, index) => {
            const advancingTeam = match.teamAId || match.teamBId;
            if (Boolean(match.teamAId) !== Boolean(match.teamBId) && advancingTeam) {
              const nextMatch = stages[stageIndex + 1][Math.floor(index / 2)];
              if (index % 2 === 0) nextMatch.teamAId = advancingTeam;
              else nextMatch.teamBId = advancingTeam;
            }
          });
        }
        stages.forEach(stage => stage.forEach(match => {
          if (match.round > 1 || (match.teamAId && match.teamBId)) {
            fixtures.push(this.matchRepository.create({
              ...match,
              tournamentId,
              stage: 'KNOCKOUT',
              scoreA: null,
              scoreB: null,
              liveStreamUrl: null,
              status: 'SCHEDULED',
            }));
          }
        }));
      } else {
        const rotation: Array<Team | null> = [...groupTeams];
        if (rotation.length % 2 === 1) rotation.push(null);
        const matchesPerRound = rotation.length / 2;
        for (let round = 1; round < rotation.length; round++) {
          for (let index = 0; index < matchesPerRound; index++) {
            const teamA = rotation[index];
            const teamB = rotation[rotation.length - 1 - index];
            if (teamA && teamB) {
              fixtures.push(this.matchRepository.create({
                tournamentId,
                groupId: group.id,
                stage: 'GROUP',
                teamAId: teamA.id,
                teamBId: teamB.id,
                round,
                matchNumber: index + 1,
                scoreA: null,
                scoreB: null,
                liveStreamUrl: null,
                status: 'SCHEDULED',
              }));
            }
          }
          rotation.splice(1, 0, rotation.pop()!);
        }
      }
    }
    if (fixtures.length > 0) await this.matchRepository.save(fixtures);

    tournament.drawLocked = true;
    await this.tournamentRepository.save(tournament);
    
    this.drawGateway.emitDrawStarted(tournamentId);

    return { 
      message: 'Bốc thăm thành công, animation đang chạy',
      stats: {
        totalPlayers: players.length,
        malesUsed: maleIndex,
        femalesUsed: femaleIndex,
        totalGroups: numberOfGroups,
        totalTeams: globalTeamCount
      }
    };
  }

      async getPlayerResult(tournamentId: string, userId: string) {
    const userTeams = await this.teamMemberRepository.find({ 
      where: { userId } 
    });

    if (userTeams.length === 0) {
      throw new NotFoundException('Bạn chưa được xếp vào đội nào');
    }

    const teamIds = userTeams.map(tm => tm.teamId);

    const myTeam = await this.teamRepository.findOne({ 
      where: { 
        id: In(teamIds), 
        tournamentId 
      } 
    });

    if (!myTeam) {
      throw new NotFoundException('Bạn không có trong danh sách bốc thăm của giải này');
    }
    let groupName = 'Nhánh đấu loại';
    if (myTeam.groupId) {
      const group = await this.groupRepository.findOne({ 
        where: { id: myTeam.groupId } 
      });
      if (group) groupName = group.name;
    }

    const myMembers = await this.teamMemberRepository.find({
      where: { teamId: myTeam.id },
    });
    const memberIds = myMembers.map(member => member.tournamentMemberId).filter((id): id is string => id !== null);
    const tournamentMembers = memberIds.length
      ? await this.tournamentMemberRepository.find({
          where: { id: In(memberIds) },
          relations: { user: true },
        })
      : [];

    const member = tournamentMembers.find(item => item.userId === userId);
    const userIds = myMembers.map(item => item.userId).filter((id): id is string => id !== null);
    const users = userIds.length
      ? await this.userRepository.find({
          where: { id: In(userIds) },
          select: { id: true, fullName: true, avatarUrl: true },
        })
      : [];
    const teamMatches = await this.matchRepository.find({
      where: { tournamentId },
      order: { round: 'ASC', matchNumber: 'ASC' },
    });
    const opponentIds = teamMatches
      .filter(match => match.teamAId === myTeam.id || match.teamBId === myTeam.id)
      .map(match => match.teamAId === myTeam.id ? match.teamBId : match.teamAId)
      .filter((id): id is string => id !== null);
    const opponents = opponentIds.length
      ? await this.teamRepository.find({ where: { id: In(opponentIds) } })
      : [];

    return {
      teamName: myTeam.name, 
      groupName: groupName, 
      profileConfirmed: member?.profileConfirmed ?? false,
      members: myMembers.map(teamMember => {
        const tournamentMember = tournamentMembers.find(item => item.id === teamMember.tournamentMemberId);
        const user = users.find(item => item.id === teamMember.userId);
        return {
          fullName: tournamentMember?.guestFullName || tournamentMember?.user?.fullName || user?.fullName || 'VĐV',
          avatarUrl: tournamentMember?.user?.avatarUrl || user?.avatarUrl || null,
        };
      }),
      matches: teamMatches
        .filter(match => match.teamAId === myTeam.id || match.teamBId === myTeam.id)
        .map(match => ({
          round: match.round,
          opponent: opponents.find(team => team.id === (match.teamAId === myTeam.id ? match.teamBId : match.teamAId))?.name || 'Chờ xác định',
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          myScore: match.teamAId === myTeam.id ? match.scoreA : match.scoreB,
          opponentScore: match.teamAId === myTeam.id ? match.scoreB : match.scoreA,
          status: match.status,
        })),
    };
  }
  async getOverallResults(tournamentId: string) {
    const tournament = await this.tournamentRepository.findOne({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Không tìm thấy giải đấu');
    const groups = await this.groupRepository.find({ 
      where: { tournamentId },
      order: { position: 'ASC' }
    });

    const teams = await this.teamRepository.find({ 
      where: { tournamentId } 
    });
    const matches = await this.matchRepository.find({
      where: { tournamentId },
      order: { round: 'ASC', matchNumber: 'ASC' },
    });

    const teamIds = teams.map(t => t.id);
    let teamMembers: TeamMember[] = [];
    let users: User[] = [];
    let tournamentMembers: TournamentMember[] = [];

    if (teamIds.length > 0) {
      teamMembers = await this.teamMemberRepository.find({
        where: { teamId: In(teamIds) }
      });

      const userIds = teamMembers.map(tm => tm.userId).filter((id): id is string => id !== null);
      if (userIds.length > 0) {
        users = await this.userRepository.find({
          where: { id: In(userIds) },
          select: {
            id: true,
            fullName: true,
            avatarUrl: true
          } 
        });
      }
      const tournamentMemberIds = teamMembers
        .map(tm => tm.tournamentMemberId)
        .filter((id): id is string => id !== null);
      if (tournamentMemberIds.length > 0) {
        tournamentMembers = await this.tournamentMemberRepository.find({
          where: { id: In(tournamentMemberIds) },
          relations: { user: true },
        });
      }
    }

    const results = groups.map(group => {
      const groupTeams = teams
        .filter(t => t.groupId === group.id)
        .map(team => {
          const membersOfTeam = teamMembers
            .filter(tm => tm.teamId === team.id)
            .map(tm => {
              const tournamentMember = tournamentMembers.find(member => member.id === tm.tournamentMemberId);
              const userInfo = users.find(u => u.id === tm.userId);
              return {
                userId: tm.userId,
                fullName: tournamentMember?.guestFullName || tournamentMember?.user?.fullName || userInfo?.fullName || 'Unknown Player',
                avatarUrl: tournamentMember?.user?.avatarUrl || userInfo?.avatarUrl || null,
              };
            });

          return {
            teamId: team.id,
            teamName: team.name,
            members: membersOfTeam
          };
        });

      return {
        groupId: group.id,
        groupName: group.name,
        teams: groupTeams,
        matches: matches
          .filter(match => match.groupId === group.id)
          .map(match => ({
            id: match.id,
            round: match.round,
            teamA: teams.find(team => team.id === match.teamAId)?.name || 'Chờ xác định',
            teamB: teams.find(team => team.id === match.teamBId)?.name || 'Chờ xác định',
            scoreA: match.scoreA,
            scoreB: match.scoreB,
            status: match.status,
          })),
      };
    });

    const knockoutMatches = matches
      .filter(match =>
        match.stage === 'KNOCKOUT' ||
        (tournament.bracket_Type === 'SINGLE_ELIMINATION' && match.stage === 'GROUP'),
      )
      .map(match => ({
        id: match.id,
        round: match.round,
        matchNumber: match.matchNumber,
        teamAId: match.teamAId,
        teamBId: match.teamBId,
        teamA: teams.find(team => team.id === match.teamAId)?.name || 'Chờ xác định',
        teamB: teams.find(team => team.id === match.teamBId)?.name || 'Chờ xác định',
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        status: match.status,
      }));
    const finalRound = Math.max(0, ...knockoutMatches.map(match => match.round));
    const finalMatch = knockoutMatches.find(match => match.round === finalRound && match.status === 'COMPLETED');
    let podium: {
      first: string | null;
      second: string | null;
      third: string[];
      thirdPlacePending: boolean;
    } = { first: null, second: null, third: [], thirdPlacePending: false };
    if (finalMatch && finalMatch.scoreA !== null && finalMatch.scoreB !== null) {
      podium.first = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamA : finalMatch.teamB;
      podium.second = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamB : finalMatch.teamA;
      const semifinalMatches = knockoutMatches.filter(match =>
        match.round === finalRound - 1 && match.status === 'COMPLETED',
      );
      const semifinalLosers = semifinalMatches.map(match =>
        match.scoreA! < match.scoreB! ? match.teamA : match.teamB,
      );
      const bronzeMatch = matches.find(match => match.stage === 'BRONZE');
      if (tournament.bronzeMatchEnabled && bronzeMatch) {
        if (bronzeMatch.status === 'COMPLETED' && bronzeMatch.scoreA !== null && bronzeMatch.scoreB !== null) {
          const winnerId = bronzeMatch.scoreA > bronzeMatch.scoreB ? bronzeMatch.teamAId : bronzeMatch.teamBId;
          podium.third = [
            teams.find(team => team.id === winnerId)?.name || 'Đang cập nhật',
          ];
        } else {
          podium.third = semifinalLosers;
          podium.thirdPlacePending = true;
        }
      } else {
        podium.third = semifinalLosers;
      }
    }

    return {
      tournamentId,
      tournamentName: tournament.name,
      drawFormat: tournament.bracket_Type,
      drawLocked: tournament.drawLocked,
      podium,
      knockoutMatches,
      groups: results,
    };
  }

  async confirmResult(tournamentId: string, userId: string) {
    const member = await this.tournamentMemberRepository.findOne({
      where: { tournamentId, userId }
    });

    if (!member) {
      throw new NotFoundException('Không tìm thấy thông tin thành viên trong giải đấu này');
    }
    if (
      member.role === MemberRole.PLAYER &&
      (
        member.invitationStatus !== InvitationStatus.ACCEPTED ||
        member.organizerApprovalStatus !== OrganizerApprovalStatus.APPROVED
      )
    ) {
      throw new BadRequestException('Chỉ VĐV đã nhận lời và được BTC duyệt mới có thể xác nhận kết quả');
    }
    if (member.role === MemberRole.REFEREE && member.invitationStatus !== InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Trọng tài cần nhận lời mời trước khi xác nhận');
    }

    member.profileConfirmed = true; 
    await this.tournamentMemberRepository.save(member);

    return { 
      success: true,
      message: 'Đã xác nhận kết quả bốc thăm thành công' 
    };
  }

}
