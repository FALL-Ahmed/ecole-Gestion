// src/exception-emploi-du-temps/entities/exception-emploi-du-temps.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Classe } from '../classe/classe.entity'; // Assumer que vous avez une entité Classe
import { Matiere } from '../matieres/matiere.entity'; // Assumer que vous avez une entité Matiere
import { User } from '../users/user.entity'; // Assumer que vous avez une entité User (pour professeurs)
import { Bloc } from '../bloc/bloc.entity';

export enum JourSemaine {
  LUNDI = 'Lundi',
  MARDI = 'Mardi',
  MERCREDI = 'Mercredi',
  JEUDI = 'Jeudi',
  VENDREDI = 'Vendredi',
  SAMEDI = 'Samedi',
}

export enum TypeException {
  ANNULATION = 'annulation',
  REMPLACEMENT_PROF = 'remplacement_prof',
  DEPLACEMENT_COURS = 'deplacement_cours',
  JOUR_FERIE = 'jour_ferie',
  EVENEMENT_SPECIAL = 'evenement_special',
}

@Entity('exception_emploi_du_temps')
export class ExceptionEmploiDuTemps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date_exception: string; // Format YYYY-MM-DD

  @Column({ type: 'enum', enum: JourSemaine })
  jour: JourSemaine;

  @Column({ type: 'time' })
  heure_debut: string; // Format HH:mm:ss

  @Column({ type: 'time' })
  heure_fin: string; // Format HH:mm:ss

  @Column({ nullable: true })
  classe_id: number | null;

  @ManyToOne(() => Classe, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'classe_id' })
  classe: Classe | null;

  @Column({ nullable: true })
  professeur_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'professeur_id' })
  professeur: User | null;

  @Column({ type: 'enum', enum: TypeException })
  type_exception: TypeException;

  @Column({ nullable: true })
  nouvelle_matiere_id: number | null;

  @ManyToOne(() => Matiere, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nouvelle_matiere_id' })
  nouvelle_matiere: Matiere | null;

  @Column({ nullable: true })
  nouveau_professeur_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nouveau_professeur_id' })
  nouveau_professeur: User | null;

  @Column({ type: 'time', nullable: true })
  nouvelle_heure_debut: string | null;

  @Column({ type: 'time', nullable: true })
  nouvelle_heure_fin: string | null;

  @Column({ nullable: true })
  nouvelle_classe_id: number | null;

  @ManyToOne(() => Classe, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nouvelle_classe_id' })
  nouvelle_classe: Classe | null;

  @Column({ type: 'enum', enum: JourSemaine, nullable: true })
  nouveau_jour: JourSemaine | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motif: string | null;

  @Column({ name: 'bloc_id' })
  blocId: number;

  @ManyToOne(() => Bloc, bloc => bloc.exceptionsEmploiDuTemps, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'bloc_id' })
  bloc: Bloc;

}
