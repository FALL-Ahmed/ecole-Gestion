// src/emploi-du-temps/entities/emploi-du-temps.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Classe } from '../classe/classe.entity'; // Assuming you have a Classe entity
import { Matiere } from '../matieres/matiere.entity'; // Assuming you have a Matiere entity
import { User } from '../users/user.entity'; // Assuming you have a User entity for Professors

export enum JourSemaine {
  LUNDI = 'Lundi',
  MARDI = 'Mardi',
  MERCREDI = 'Mercredi',
  JEUDI = 'Jeudi',
  VENDREDI = 'Vendredi',
  SAMEDI = 'Samedi',
}

@Entity('emploidutemps')
export class EmploiDuTemps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: JourSemaine })
  jour: JourSemaine;

  @Column({ type: 'time' })
  heure_debut: string;

  @Column({ type: 'time' })
  heure_fin: string;

  @Column()
  classe_id: number;

  @ManyToOne(() => Classe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classe_id' })
  classe: Classe;

  @Column()
  matiere_id: number;

  @ManyToOne(() => Matiere, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matiere_id' })
  matiere: Matiere;

  @Column()
  professeur_id: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' }) // Assuming a 'User' entity for professors
  @JoinColumn({ name: 'professeur_id' })
  professeur: User;
}