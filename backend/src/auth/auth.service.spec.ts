import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/Entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  const usersRepository = {
    findOne: jest.fn(),
    create: jest.fn((user: Partial<User>) => user),
    save: jest.fn(async (user: Partial<User>) => ({ ...user, id: 'new-user-id' })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'test-token') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('keeps organizer registration pending until an admin approves it', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    const result = await service.register({
      email: 'organizer@example.com',
      password: 'password123',
      fullName: 'Organizer',
      requestedRole: 'ORGANIZER' as User['role'],
    });

    expect(result.user.role).toBe('PLAYER');
    expect(result.user.requestedRole).toBe('ORGANIZER');
    expect(result.user.organizerApprovalStatus).toBe('PENDING');
  });

  it('accepts role as the public signup field for player and organizer requests', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    const result = await service.register({
      email: 'organizer@example.com',
      password: 'password123',
      fullName: 'Organizer',
      role: 'ORGANIZER' as User['role'],
    });

    expect(result.user.role).toBe('PLAYER');
    expect(result.user.requestedRole).toBe('ORGANIZER');
  });

  it('does not allow public registration to grant admin', async () => {
    await expect(service.register({
      email: 'admin@example.com',
      password: 'password123',
      fullName: 'Admin',
      role: 'ADMIN' as User['role'],
    })).rejects.toThrow('Không thể tự đăng ký ADMIN hoặc REFEREE');
    expect(usersRepository.findOne).not.toHaveBeenCalled();
  });
});
