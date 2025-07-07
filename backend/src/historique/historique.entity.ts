import { User } from '../users/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';

export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';

@Entity('historique')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  userId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  utilisateur: User;

  @Column({ type: 'varchar', length: 50 })
  action: ActionType;

  @Column({ type: 'varchar', length: 100 })
  entite: string;

  @Column()
  entiteId: number;

  @Column({ type: 'json', nullable: true })
  details: any; // { avant: any, apres: any }

  @Column({ type: 'text' })
  description: string;
}
