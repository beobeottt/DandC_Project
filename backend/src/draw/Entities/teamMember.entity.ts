import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity('team_members')
@Unique('UQ_team_member', ['teamId', 'userId'])
export class TeamMember
{
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({type: 'uuid'})
    teamId: string;

    @Column({type: 'uuid'})
    userId: string;
}