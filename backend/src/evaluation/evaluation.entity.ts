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
import { User } from 'src/users/user.entity'; // This is correct for professeur
import { Trimestre } from 'src/trimestre/trimestre.entity';
import { anneescolaire } from 'src/annee-academique/annee-academique.entity';
import { Note } from 'src/note/note.entity';

@Entity('evaluation')
export class Evaluation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Matiere)
  @JoinColumn({ name: 'matiere_id' })
  matiere: Matiere;

  @ManyToOne(() => Classe)
  @JoinColumn({ name: 'classe_id' })
  classe: Classe;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'professeur_id' })
  professeur: User;

  @Column()
  type: string;

  @Column({ type: 'date', name: 'date_eval' })
  dateEval: string;

  @ManyToOne(() => Trimestre)
@JoinColumn({ name: 'trimestre' }) // nom explicite et clair
trimestre: Trimestre;

@Column({ name: 'trimestre' }) // colonne pour gérer facilement l'ID
trimestreId: number;


  @ManyToOne(() => anneescolaire)
  @JoinColumn({ name: 'annee_scolaire_id' })
  anneeScolaire: anneescolaire;

  @OneToMany(() => Note, (note) => note.evaluation)
  notes: Note[];
}