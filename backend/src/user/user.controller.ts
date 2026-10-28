import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request as Req,
  Delete,
  Param,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserProfileDto } from './Dtos/update-user-profile.dto';
import { UpdatePlayerSkillsDto } from './Dtos/update-player-skills.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/User.enum';
import { CreateAccountDto } from './Dtos/create-account.dto';
import { OrganizerApprovalDto } from './Dtos/organizer-approval.dto';
import { UpdatePlayerLevelDto } from './Dtos/update-player-level.dto';

export interface AuthRequest extends Request {
  user: {
    id: string;
    role: string;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Get('match-history')
  @Roles(UserRole.PLAYER)
  getMyMatchHistory(@Req() req: AuthRequest) {
    return this.userService.getMyMatchHistory(req.user.id);
  }

  @Get('admin/accounts')
  @Roles(UserRole.ADMIN)
  listAccounts() {
    return this.userService.listAccounts();
  }

  @Post('admin/accounts')
  @Roles(UserRole.ADMIN)
  createAccount(@Body() dto: CreateAccountDto) {
    return this.userService.createAccount(dto);
  }

  @Patch('admin/accounts/:id/organizer-approval')
  @Roles(UserRole.ADMIN)
  decideOrganizerRequest(
    @Param('id') userId: string,
    @Body() dto: OrganizerApprovalDto,
  ) {
    return this.userService.decideOrganizerRequest(userId, dto);
  }

  @Delete('admin/accounts/:id')
  @Roles(UserRole.ADMIN)
  deleteAccount(@Req() req: AuthRequest, @Param('id') userId: string) {
    return this.userService.deleteAccount(userId, req.user.id);
  }

  @Get('admin/player-ratings')
  @Roles(UserRole.ADMIN)
  listPlayerRatings() {
    return this.userService.listPlayerRatings();
  }

  @Get('admin/accounts/:id/rating-history')
  @Roles(UserRole.ADMIN)
  getPlayerRatingHistory(@Param('id') userId: string) {
    return this.userService.getPlayerRatingHistory(userId);
  }

  @Patch('admin/accounts/:id/level')
  @Roles(UserRole.ADMIN)
  updatePlayerLevel(
    @Req() req: AuthRequest,
    @Param('id') userId: string,
    @Body() dto: UpdatePlayerLevelDto,
  ) {
    return this.userService.updatePlayerLevel(userId, req.user.id, dto);
  }
}
