// src/emploi-du-temps/entities/emploi-du-temps.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Classe } from '../classe/classe.entity'; // Assuming you have a Classe entity
import { Matiere } from '../matieres/matiere.entity'; // Assuming you have a Matiere entity
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { User } from '../users/user.entity'; // Assuming you have a User entity for Professors
import { Bloc } from '../bloc/bloc.entity';

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

    @Column({ name: 'bloc_id' })
  blocId: number;

  @ManyToOne(() => Bloc, bloc => bloc.emploiDuTemps, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'bloc_id' })
  bloc: Bloc;

  @ManyToOne(() => User, { onDelete: 'SET NULL' }) // Assuming a 'User' entity for professors
  @JoinColumn({ name: 'professeur_id' })
  professeur: User;

  @Column({ nullable: true }) // Rendre nullable si des anciennes données existent
  annee_academique_id: number;

  @ManyToOne(() => anneescolaire, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'annee_academique_id' })
  anneeAcademique: anneescolaire;
}