import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { Absence } from '../absence/absence.entity'; // Adaptez le chemin

 // Assure-toi d'avoir cette entité importée

export enum UserRole {
  ADMIN = 'admin',
  PROFESSEUR = 'professeur',
  ETUDIANT = 'eleve',
}

export enum Genre {
  MASCULIN = 'masculin',
  FEMININ = 'feminin',
}


@Entity('utilisateurs')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 100 })
  prenom: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ name: 'mot_de_passe', length: 255 })
  motDePasse: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: Genre,
    nullable: true,
  })
  genre: Genre | null;

  @Column({ type: 'text', nullable: true })
  adresse: string | null;

  @Column({ 
    name: 'tuteur', // On garde le mapping vers la colonne existante
    type: 'varchar',
    length: 100, 
    nullable: true 
  })
  tuteurNom?: string | null;  // Nom plus explicite dans le code

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'tuteur_telephone' // Si la colonne existe déjà en BDD
  })
  tuteurTelephone?: string | null;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl: string | null;

  

  @Column({ default: true })
  actif: boolean;

  @OneToMany(() => Absence, (absence: Absence) => absence.etudiant) // Typer le paramètre absence
  absences: Absence[];
  
}
