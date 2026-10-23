import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request as Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserProfileDto } from './Dtos/update-user-profile.dto';
import { UpdatePlayerSkillsDto } from './Dtos/update-player-skills.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

export interface AuthRequest extends Request {
  user: {
    id: string;
    role: string;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: AuthRequest) {
    return this.userService.getProfile(req.user?.id || (req as any)?.sub);
  }

  @Patch('profile')
  updateProfile(
    @Req() req: AuthRequest,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.userService.updateProfile(req.user?.id || (req as any)?.sub, dto);
  }

  @Patch('skills')
  updateSkills(
    @Req() req: AuthRequest,
    @Body() dto: UpdatePlayerSkillsDto,
  ) {
    return this.userService.updatePlayerSkills(req.user?.id || (req as any)?.sub, dto);
  }

  @Get('invitations')
  getMyInvitations(@Req() req: AuthRequest) {
    return this.userService.getMyInvitations(req.user?.id || (req as any)?.sub);
  }
}
