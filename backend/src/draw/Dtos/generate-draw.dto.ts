import { IsInt, Min } from "class-validator";

export class GenerateDrawDto
{
    @IsInt()
    @Min(1)
    malesPerTeam: number;

    @IsInt()
    @Min(1)
    femalesPerTeam: number;

    @IsInt()
    @Min(2)
    teamsPerGroup: number;
}