
import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { UserService } from './user.service';
import { UpdatePlayerSkillsDto } from './Dtos/update-player-skills.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserProfileDto } from './Dtos/update-user-profile.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.userService.getProfile(req.user.userId);
  }

  @Patch('me')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.userService.updateProfile(req.user.userId, dto);
  }

  @Patch('me/skills')
  updatePlayerSkills(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdatePlayerSkillsDto,
  ) {
    return this.userService.updatePlayerSkills(
      req.user.userId,
      dto,
    );
  }

  @Get('me/invitations')
  getMyInvitations(@Req() req: AuthenticatedRequest) {
    return this.userService.getMyInvitations(req.user.userId);
  }
}
