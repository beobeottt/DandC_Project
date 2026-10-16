
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

import { UserRole } from '../../common/User.enum';
import { PickleballSkill, PlayingHand, PreferredPosition } from '../../common/player-skill.enum';
import { ColdObservable } from 'rxjs/internal/testing/ColdObservable';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 120 })
    fullName: string;

    @Column({ type: 'varchar', unique: true, length: 120 })
    email: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.PLAYER,
    })
    role: UserRole;

    @Column({type: 'varchar', length: 255, select: false})
    passwordhash: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    avatarUrl: string | null;

    @Column({ type: 'enum', enum: PlayingHand, nullable: true })
    playingHand: PlayingHand | null;

    @Column({ type: 'enum', enum: PreferredPosition, nullable: true })
    preferredPosition: PreferredPosition | null;


    @Column({
        type: 'decimal',
        precision: 2,
        scale: 1,
        default: 1.0,
        transformer: {
            to: (value: number) => value,
            from: (value: string | number) => Number(value),
        },
    })
    level: number;


    @Column({
        type: 'jsonb',
        default: () => "'[]'::jsonb",
    })
    skills: PickleballSkill[];

    @Column({ type: 'text', nullable: true })
    bio: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    UpdateAt: Date;
}
