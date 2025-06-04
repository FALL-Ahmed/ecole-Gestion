import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Entity('trimestre') // correspond exactement au nom de la table
export class Trimestre {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nom: string;

  @Column({ type: 'date' })
  date_debut: string;

  @Column({ type: 'date' })
  date_fin: string;

  @ManyToOne(() => anneescolaire, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'annee_scolaire_id' }) // important de préciser le nom exact de la colonne dans la BDD
  anneeScolaire: anneescolaire;
}
