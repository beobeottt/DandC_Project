import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid') 
  id: string;
  @Column({ type: 'uuid' }) 
  tournamentId: string;
  @Column({ type: 'uuid', nullable: true }) 
  groupId: string | null;
  @Column({ length: 100 }) 
  name: string;
}
