import { ArrayMinSize, IsArray, IsUUID } from "class-validator";

export class EditDrawDto {
    @IsUUID() 
    organizerId: string;
    @IsArray()
    @ArrayMinSize(2)
    @IsUUID('4', { each: true })
    teamIds: string[];
}