// inscription.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Entity('inscriptions')  // nom exact de ta table en base
export class Inscription {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  utilisateur: User;

  @ManyToOne(() => Classe)
  classe: Classe;

  @ManyToOne(() => anneescolaire)
  annee_scolaire: anneescolaire;

  @CreateDateColumn()
  date_inscription: Date;

  @Column({ default: true })
  actif: boolean;
}

