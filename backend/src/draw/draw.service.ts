import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GenerateDrawDto } from './Dtos/generate-draw.dto';
import { DrawGateway } from './draw.gateway';
import { In } from 'typeorm';
import { Team } from './Entities/team.entity';
import { TeamMember } from './Entities/teamMember.entity';
import { TournamentGroup } from './Entities/group.entity';
import { Tournament } from '../tournament/Entities/tounament.entity';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { User } from '../user/Entities/user.entity';
import { InvitationStatus, MemberRole, OrganizerApprovalStatus } from '../common/TournamentMember.enum';

@Injectable()
export class DrawService {
  constructor(
    @InjectRepository(Team) private readonly teamRepository: Repository<Team>,
    @InjectRepository(TournamentGroup) private readonly groupRepository: Repository<TournamentGroup>,
    @InjectRepository(Tournament) private readonly tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentMember) private readonly tournamentMemberRepository: Repository<TournamentMember>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(TeamMember) private readonly teamMemberRepository: Repository<TeamMember>,
    private readonly drawGateway: DrawGateway,
  ) {}

  async generateDraw(tournamentId: string, organizerId: string, dto: GenerateDrawDto) {
    const { malesPerTeam, femalesPerTeam, teamsPerGroup } = dto;
    const playersPerTeam = malesPerTeam + femalesPerTeam;

    if (playersPerTeam === 0) {
      throw new BadRequestException('Một đội phải có ít nhất 1 thành viên');
    }

    const tournament = await this.tournamentRepository.findOne({ where: { id: tournamentId } });
    if (!tournament || tournament.organizerId !== organizerId) {
      throw new BadRequestException('Giải đấu không hợp lệ hoặc bạn không có quyền');
    }

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
        this.groupRepository.create({ tournamentId, name: `Bảng ${g + 1}`, position: g + 1 })
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

    return {
      teamName: myTeam.name, 
      groupName: groupName, 
    };
  }
  async getOverallResults(tournamentId: string) {
    const groups = await this.groupRepository.find({ 
      where: { tournamentId },
      order: { position: 'ASC' }
    });

    const teams = await this.teamRepository.find({ 
      where: { tournamentId } 
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
        teams: groupTeams
      };
    });

    return results;
  }

  async confirmResult(tournamentId: string, userId: string) {
    const member = await this.tournamentMemberRepository.findOne({
      where: { tournamentId, userId }
    });

    if (!member) {
      throw new NotFoundException('Không tìm thấy thông tin thành viên trong giải đấu này');
    }

    member.profileConfirmed = true; 
    await this.tournamentMemberRepository.save(member);

    return { 
      success: true,
      message: 'Đã xác nhận kết quả bốc thăm thành công' 
    };
  }

}
