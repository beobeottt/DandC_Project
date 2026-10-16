import { IsDecimal, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { CompetitionType } from "../../common/Tournament.enum";
import { DrawFormat } from "../../common/Draw.enum";
import { Decimal128 } from "typeorm/driver/mongodb/bson.typings.js";

export class SetupTournamentDto
{
    @IsOptional()
    @IsEnum(CompetitionType)
    competitionType?: CompetitionType;

    @IsOptional()
    @IsEnum(DrawFormat)
    drawFormat?: DrawFormat;

    @IsOptional()
    @IsInt()
    @Min(1)
    playersPerTeam?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    menPerTeam?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    womenPerTeam?: number;

    @IsOptional()
    @IsDecimal()
    @Min(0)
    @Max(1)
    PersentconfirmationThreshold?: Decimal128;

    @IsUUID()
    organizerId: string;

}