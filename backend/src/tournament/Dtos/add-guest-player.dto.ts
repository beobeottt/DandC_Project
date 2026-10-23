import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AddGuestPlayerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: string;
}
