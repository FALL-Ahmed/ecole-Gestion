import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Entity('professor_absences')
export class ProfessorAbsence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'professeur_id' })
  professeurId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professeur_id' })
  professeur: User;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time', nullable: true })
  heure_debut: string;

  @Column({ type: 'time', nullable: true })
  heure_fin: string;

  @Column({ default: false })
  justified: boolean;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @Column({ name: 'annee_scolaire_id' })
  anneeScolaireId: number;

  @ManyToOne(() => anneescolaire, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'annee_scolaire_id' })
  anneeScolaire: anneescolaire;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}

