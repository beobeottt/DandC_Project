import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
@Entity('tournament_groups')
export class TournamentGroup
{
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({type: 'uuid'})
    tournamentId: string;

    @Column({length: 40})
    name: string;

    @Column({type: 'int'})
    position: number;

}