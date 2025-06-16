import { anneescolaire } from '../annee-academique/annee-academique.entity'; // Adaptez le chemin
import { Classe } from '../classe/classe.entity'; // Adaptez le chemin
import { Matiere } from '../matieres/matiere.entity'; // Adaptez le chemin
import { User } from '../users/user.entity'; // Adaptez le chemin
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('absence')
export class Absence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string; // ou Date

  @Column({ type: 'time', nullable: true })
  heure_debut: string;

  @Column({ type: 'time', nullable: true })
  heure_fin: string;

  @Column({ default: false })
  justifie: boolean;

  @Column({ type: 'text', nullable: true })
  justification: string;

  @ManyToOne(() => User, (utilisateur) => utilisateur.absences, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etudiant_id' })
  etudiant: User;

  @Column()
  etudiant_id: number;

  @ManyToOne(() => Matiere, (matiere) => matiere.absences, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'matiere_id' })
  matiere: Matiere;

  @Column({nullable: true})
  matiere_id: number;

  @ManyToOne(() => Classe, (classe) => classe.absences, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classe_id' })
  classe: Classe;

  @Column()
  classe_id: number;

  @ManyToOne(() => anneescolaire, (anneeScolaire) => anneeScolaire.absences, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'annee_scolaire_id' })
  anneeScolaire: anneescolaire;

  @Column()
  annee_scolaire_id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
