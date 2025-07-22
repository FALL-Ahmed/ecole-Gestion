// classe.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Inscription } from '../inscription/inscription.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { Absence } from '../absence/absence.entity'; // Adaptez le chemin
import { Evaluation } from '../evaluation/evaluation.entity'; // Ajustez le chemin si nécessaire
import { Chapitre } from '../chapitre/chapitre.entity'; // Assurez-vous que le chemin est correct
import { Bloc } from '../bloc/bloc.entity';




export enum Niveau {
  PRIMAIRE = 'primaire',
  COLLEGE = 'collège',
  LYCEE = 'lycée',
}

// classe.entity.ts
@Entity()
export class Classe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nom: string;

  @Column({ type: 'enum', enum: Niveau })
  niveau: Niveau;

  @OneToMany(() => Inscription, (inscription) => inscription.classe)
  inscriptions: Inscription[];

  // Ajouter explicitement la colonne qui contient l'ID de l'année scolaire
  @Column()
  annee_scolaire_id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00, name: 'frais_scolarite' })
  frais_scolarite: number; // CHAMP AJOUTÉ


  @ManyToOne(() => anneescolaire, (anneeScolaire) => anneeScolaire.classes)
  @JoinColumn({ name: 'annee_scolaire_id' })
  anneeScolaire: anneescolaire;
  
  @OneToMany(() => Absence, (absence) => absence.classe)
absences: Absence[];

@OneToMany(() => Chapitre, chapitre => chapitre.classe)
  chapitres: Chapitre[];


@OneToMany(() => Evaluation, (evaluation) => evaluation.classe)
  // 'evaluation.classe' est la propriété dans l'entité Evaluation qui mappe vers cette classe
  evaluations: Evaluation[]; // Une classe peut avoir plusieurs évaluations

   @Column({ name: 'bloc_id' })
  blocId: number;

  @ManyToOne(() => Bloc, bloc => bloc.classes, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'bloc_id' })
  bloc: Bloc;
}
