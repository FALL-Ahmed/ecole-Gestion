// classe.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Inscription } from '../inscription/inscription.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { Absence } from '../absence/absence.entity'; // Adaptez le chemin


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

  @ManyToOne(() => anneescolaire, (anneeScolaire) => anneeScolaire.classes)
  @JoinColumn({ name: 'annee_scolaire_id' })
  anneeScolaire: anneescolaire;
  
  @OneToMany(() => Absence, (absence) => absence.classe)
absences: Absence[];
}
