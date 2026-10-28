import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/Entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'YOUR_SECRET_KEY', 
    });
  }

  async validate(payload: { sub: string; username: string }) {
    const user = await this.users.findOne({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');
    return { id: user.id, username: user.email, role: user.role };
  }
}
