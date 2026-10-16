
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from './Entities/user.entity';
import { TournamentMember } from '../tournament/Entities/tournamentMember.entity';
import { UpdatePlayerSkillsDto } from './Dtos/update-player-skills.dto';
import { UpdateUserProfileDto } from './Dtos/update-user-profile.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(TournamentMember)
    private readonly memberRepository: Repository<TournamentMember>,
  ) {}

  async getProfile(userId: string) {
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

    Object.assign(user, dto);

    const savedUser = await this.userRepository.save(user);

    return this.toProfileResponse(savedUser);
  }

  async updatePlayerSkills(
    userId: string,
    dto: UpdatePlayerSkillsDto,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, dto);

    const savedUser = await this.userRepository.save(user);

    return this.toProfileResponse(savedUser);
  }

  async getMyInvitations(userId: string) {
    return this.memberRepository.find({
      where: { userId },
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
      level: user.level,
      playingHand: user.playingHand,
      preferredPosition: user.preferredPosition,
      skills: user.skills,
      bio: user.bio,
      createAt: user.createAt,
      UpdateAt: user.UpdateAt,
    };
  }
}
