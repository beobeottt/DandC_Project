import { IsBoolean, IsOptional, IsUUID } from "class-validator";

export class DrawDto
{
    @IsUUID()
    organizerId: string;

    @IsOptional()
    @IsBoolean()
    lock?: boolean;
}