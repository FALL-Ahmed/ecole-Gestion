import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
// Supposons que vous ayez des entités Matiere et Classe
import { Matiere } from '../matieres/matiere.entity'; // Adaptez le chemin
import { Classe } from '../classe/classe.entity'; // Adaptez le chemin
import { Bloc } from '../bloc/bloc.entity';

export enum StatutChapitre {
  PLANIFIE = 'planifié',
  EN_COURS = 'en_cours',
  TERMINE = 'terminé',
}

@Entity('chapitre') // Nom de la table dans la base de données
export class Chapitre {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  titre: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'matiere_id' })
  matiereId: number;

  // Optionnel: Décommentez si vous avez une entité Matiere et voulez une relation
  @ManyToOne(() => Matiere, matiere => matiere.chapitres, { eager: true })
  @JoinColumn({ name: 'matiere_id' })
  matiere: Matiere;

  @Column({ name: 'classe_id' })
  classeId: number;

 
  @ManyToOne(() => Classe, classe => classe.chapitres, { eager: true })
  @JoinColumn({ name: 'classe_id' })
  classe: Classe;

  @Column({ type: 'date', nullable: true, name: 'date_debut_prevue' })
  dateDebutPrevue: Date; // Suggestion: Utiliser le type Date

  @Column({ type: 'date', nullable: true, name: 'date_fin_prevue' })
  dateFinPrevue: Date; // Suggestion: Utiliser le type Date

    @Column({ type: 'date', nullable: true, name: 'date_debut_reel' })
  dateDebutReel: Date; // Suggestion: Utiliser le type Date


  @Column({ type: 'date', nullable: true, name: 'date_fin_reel' })
  dateFinReel: Date; // Suggestion: Utiliser le type Date

 @Column({ name: 'bloc_id' })
  blocId: number;

  @ManyToOne(() => Bloc, bloc => bloc.chapitres, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'bloc_id' })
  bloc: Bloc;

  @Column({
    type: 'enum',
    enum: StatutChapitre,
    default: StatutChapitre.PLANIFIE,
  })
  statut: StatutChapitre;
}
