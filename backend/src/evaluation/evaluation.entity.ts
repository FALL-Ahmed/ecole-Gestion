import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Matiere } from 'src/matieres/matiere.entity';
import { Classe } from 'src/classe/classe.entity';
import { User } from 'src/users/user.entity'; // Remplace selon le nom réel de ton entité
import { Trimestre } from 'src/trimestre/trimestre.entity';
import { anneescolaire } from 'src/annee-academique/annee-academique.entity';

@Entity('evaluation') // correspond à la table existante
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
  @JoinColumn({ name: 'professeur_id' }) // le champ dans la table 'evaluation'
  professeur: User;

  @Column()
  type: string;

  @Column({ type: 'date', name: 'date_eval' })
  dateEval: string;

  @ManyToOne(() => Trimestre)
  @JoinColumn({ name: 'trimestre' })
  trimestre: Trimestre;

  @ManyToOne(() => anneescolaire)
  @JoinColumn({ name: 'annee_scolaire_id' })
  anneeScolaire: anneescolaire;
}
