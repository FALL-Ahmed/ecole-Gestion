import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { Bloc } from '../bloc/bloc.entity';

@Entity('inscriptions') // Nom exact de ta table en base
export class Inscription {
  @PrimaryGeneratedColumn()
  id: number;

  // Clé étrangère explicite pour 'utilisateur'
  @Column() // Assurez-vous que le nom de la colonne correspond à votre base de données, ex: utilisateurId
  utilisateurId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'utilisateurId' }) // Lie la relation à la colonne 'utilisateurId'
  utilisateur: User;

  // Clé étrangère explicite pour 'classe'
  @Column() // ex: classeId
  classeId: number;

  @ManyToOne(() => Classe)
  @JoinColumn({ name: 'classeId' }) // Lie la relation à la colonne 'classeId'
  classe: Classe;

  // Clé étrangère explicite pour 'annee_scolaire'
  @Column() // ex: anneeScolaireId
  anneeScolaireId: number;

  @ManyToOne(() => anneescolaire)
  @JoinColumn({ name: 'anneeScolaireId' }) // Lie la relation à la colonne 'anneeScolaireId'
  annee_scolaire: anneescolaire;

  @CreateDateColumn()
  date_inscription: Date;
   @Column({ name: 'bloc_id' })
  blocId: number;

  @ManyToOne(() => Bloc, bloc => bloc.inscriptions, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'bloc_id' })
  bloc: Bloc;
  // FIX: Utilise un transformer pour gérer la conversion entre boolean (JS) et 0/1 (DB)
  @Column({
    default: true,
    type: 'tinyint', // Ou 'boolean' si votre DB le supporte nativement, mais 'tinyint' est courant pour 0/1
    transformer: {
      from: (dbValue: number) => dbValue === 1, // Convertit 0/1 de la DB en true/false
      to: (entityValue: boolean) => (entityValue ? 1 : 0), // Convertit true/false en 1/0 pour la DB
    },
  })
  actif: boolean; // Le type TypeScript reste boolean
}