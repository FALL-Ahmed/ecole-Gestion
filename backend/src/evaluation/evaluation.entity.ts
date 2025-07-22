// src/evaluation/evaluation.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Matiere } from 'src/matieres/matiere.entity';
import { Classe } from 'src/classe/classe.entity';
import { User } from 'src/users/user.entity';
import { Trimestre } from 'src/trimestre/trimestre.entity';
import { anneescolaire } from 'src/annee-academique/annee-academique.entity';
import { Note } from 'src/note/note.entity';
import { Bloc } from '../bloc/bloc.entity';

@Entity('evaluation')
export class Evaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Matiere)
  @JoinColumn({ name: 'matiere_id' })
  matiere: Matiere;

  @ManyToOne(() => Classe, (classe) => classe.evaluations)
  @JoinColumn({ name: 'classe_id' })
  classe: Classe;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'professeur_id' })
  professeur: User;

  @Column()
  type: string;

  @Column({ type: 'date', name: 'date_eval' })
date_eval: string;


  @ManyToOne(() => Trimestre)
  @JoinColumn({ name: 'trimestre' }) // Nom de colonne exact comme dans la BDD
  trimestre: Trimestre;

  @ManyToOne(() => anneescolaire)
  @JoinColumn({ name: 'annee_scolaire_id' })
  anneeScolaire: anneescolaire;

  @OneToMany(() => Note, (note) => note.evaluation)
  notes: Note[];
   @Column({ name: 'bloc_id' })
  blocId: number;

  @ManyToOne(() => Bloc, bloc => bloc.evaluations, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'bloc_id' })
  bloc: Bloc;
}