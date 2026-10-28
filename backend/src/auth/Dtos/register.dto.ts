import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { UserRole } from "../../common/User.enum";

export class RegisterDto {
    @IsEmail({}, {message: 'Invalid email format'})
    email: string;

    @IsNotEmpty()
    @MinLength(6, {message: 'Password must be at least 6 characters long'})
    password: string;

    @IsNotEmpty()
    @IsString()
    fullName: string;

    @IsOptional()
    @IsIn([UserRole.PLAYER, UserRole.ORGANIZER])
    requestedRole?: UserRole.PLAYER | UserRole.ORGANIZER;

    @IsOptional()
    @IsIn([UserRole.PLAYER, UserRole.ORGANIZER])
    role?: UserRole.PLAYER | UserRole.ORGANIZER;
}
