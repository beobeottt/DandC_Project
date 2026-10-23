import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/Entities/user.entity';
import { RegisterDto } from './Dtos/register.dto';
import { UserRole } from '../common/User.enum';


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
        passwordHash: true,
      }
    });
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash: _hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Pick<User, 'id' | 'email' | 'fullName' | 'role'>) {
    const payload = { username: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDto): Promise<{ user: Omit<User, 'passwordHash'>; access_token: string }> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const newUser = this.usersRepository.create({
      email: dto.email,
      passwordHash: hashedPassword,
      fullName: dto.fullName,
      role: UserRole.PLAYER,
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
