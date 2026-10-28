import { IsInt, Min } from "class-validator";

export class GenerateDrawDto
{
    @IsInt()
    @Min(0)
    malesPerTeam: number;

    @IsInt()
    @Min(0)
    femalesPerTeam: number;

    @IsInt()
    @Min(2)
    teamsPerGroup: number;
}