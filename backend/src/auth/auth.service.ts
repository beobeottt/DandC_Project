import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/Entities/user.entity';
import { RegisterDto } from './Dtos/register.dto';
import { UserRole } from '../common/User.enum';
import { OrganizerApprovalStatus } from '../common/TournamentMember.enum';


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
  
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersRepository.findOne({ 
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        requestedRole: true,
        organizerApprovalStatus: true,
        passwordHash: true,
      }
    });
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash: _hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Pick<User, 'id' | 'email' | 'fullName' | 'role' | 'requestedRole' | 'organizerApprovalStatus'>) {
    const payload = { username: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        requestedRole: user.requestedRole,
        organizerApprovalStatus: user.organizerApprovalStatus,
      },
    };
  }

  async register(dto: RegisterDto): Promise<{ user: Omit<User, 'passwordHash'>; access_token: string }> {
    if (
      typeof dto.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email.trim()) ||
      typeof dto.password !== 'string' ||
      dto.password.length < 6 ||
      typeof dto.fullName !== 'string' ||
      !dto.fullName.trim()
    ) {
      throw new BadRequestException('Họ tên, email hợp lệ và mật khẩu tối thiểu 6 ký tự là bắt buộc');
    }
    for (const role of [dto.role, dto.requestedRole]) {
      if (
        role !== undefined &&
        role !== UserRole.PLAYER &&
        role !== UserRole.ORGANIZER
      ) {
        throw new BadRequestException(
          'Không thể tự đăng ký ADMIN hoặc REFEREE. ADMIN cần được tạo bởi bootstrap/admin.',
        );
      }
    }
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    if (dto.role && dto.requestedRole && dto.role !== dto.requestedRole) {
      throw new BadRequestException('Vai trò đăng ký không thống nhất');
    }
    const requestedRole = dto.requestedRole ?? dto.role ?? UserRole.PLAYER;
    const newUser = this.usersRepository.create({
      email: dto.email.trim().toLowerCase(),
      passwordHash: hashedPassword,
      fullName: dto.fullName.trim(),
      role: UserRole.PLAYER,
      requestedRole,
      organizerApprovalStatus: requestedRole === UserRole.ORGANIZER
        ? OrganizerApprovalStatus.PENDING
        : null,
    });

    const savedUser = await this.usersRepository.save(newUser);

    const { passwordHash: _hash, ...result } = savedUser;
    
    const payload = { username: savedUser.email, sub: savedUser.id, role: savedUser.role };
    return {
      user: result,
      access_token: this.jwtService.sign(payload),
    };
  }
}
