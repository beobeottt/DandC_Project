import { 
  Controller, 
  Post, 
  Get, 
  Patch,
  Param, 
  Body, 
  UseGuards, 
  Request as Req 
} from '@nestjs/common';
import { Request } from 'express';
import { DrawService } from './draw.service';
import { GenerateDrawDto } from './Dtos/generate-draw.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/User.enum';

export interface AuthRequest extends Request {
  user: {
    id: string;
    role: string;
  };
}

@Controller('draw')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DrawController {
  constructor(private readonly drawService: DrawService) {}

  // ==========================================
  // BƯỚC 3: NGƯỜI TỔ CHỨC NHẤN BỐC THĂM
  // ==========================================
  @Post(':tournamentId/start')
  @Roles(UserRole.ORGANIZER)
  startDraw(
    @Req() req: AuthRequest,
    @Param('tournamentId') tournamentId: string, 
    @Body() dto: GenerateDrawDto,
  ) {
    return this.drawService.generateDraw(tournamentId, req.user.id, dto);
  }

  // ==========================================
  // BƯỚC 5: XEM KẾT QUẢ BỐC THĂM
  // ==========================================
  
  // Dành cho Vận động viên
  @Get(':tournamentId/my-result')
  @Roles(UserRole.PLAYER)
  getMyResult(
    @Req() req: AuthRequest,
    @Param('tournamentId') tournamentId: string, 
  ) {
    return this.drawService.getPlayerResult(tournamentId, req.user.id);
  }

  // Dành cho Người tổ chức & Trọng tài
  @Get(':tournamentId/overall')
  @Roles(UserRole.ORGANIZER, UserRole.REFEREE)
  getOverallResults(
    @Param('tournamentId') tournamentId: string
  ) {
    return this.drawService.getOverallResults(tournamentId);
  }

  // ==========================================
  // BƯỚC 5: XÁC NHẬN THÔNG TIN
  // ==========================================
  @Patch(':tournamentId/confirm-result')
  // Cả 3 role đều có nút "Xác nhận thông tin" ở màn hình cuối
  @Roles(UserRole.PLAYER, UserRole.ORGANIZER, UserRole.REFEREE) 
  confirmResult(
    @Req() req: AuthRequest,
    @Param('tournamentId') tournamentId: string, 
  ) {
    return this.drawService.confirmResult(tournamentId, req.user.id);
  }
}
