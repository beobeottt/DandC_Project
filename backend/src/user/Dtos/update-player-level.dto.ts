import { IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdatePlayerLevelDto {
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(6)
  level: number;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
