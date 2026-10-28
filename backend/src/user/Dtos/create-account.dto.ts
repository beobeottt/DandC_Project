import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../common/User.enum';

export class CreateAccountDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn([UserRole.PLAYER, UserRole.ORGANIZER, UserRole.ADMIN])
  role: UserRole.PLAYER | UserRole.ORGANIZER | UserRole.ADMIN;
}
