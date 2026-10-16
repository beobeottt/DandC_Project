import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('matches')
export class Match {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ type: 'uuid' }) tournamentId: string;
    @Column({ type: 'uuid', nullable: true }) groupId: string | null;
    @Column({ type: 'uuid', nullable: true }) teamAId: string | null;
    @Column({ type: 'uuid', nullable: true }) teamBId: string | null;
    @Column({ type: 'int' }) round: number;
    @Column({ type: 'int' }) matchNumber: number;
    @Column({ type: 'int', nullable: true }) scoreA: number | null;
    @Column({ type: 'int', nullable: true }) scoreB: number | null;
    @Column({ length: 20, default: 'SCHEDULED' }) status: string;
}