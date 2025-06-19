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

  // Relation vers Classe
  @ManyToOne(() => Classe, (classe) => classe.evaluations, { eager: false })
  @JoinColumn({ name: 'classe_id' }) // Nom de la colonne clé étrangère
  classe: Classe; // Propriété pour l'objet Classe lié (utile si vous avez besoin d'autres infos de la classe)

  @Column({ name: 'classe_id' }) // Colonne pour stocker l'ID de la classe directement
  classeId: number; // Correspond à l'attente du frontend pour un accès direct


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