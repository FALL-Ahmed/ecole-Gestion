import { Entity, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm';
import { anneescolaire } from 'src/annee-academique/annee-academique.entity';

@Entity('configuration')
export class Configuration {
  @PrimaryColumn({ default: 1 })
  id: number;

  @OneToOne(() => anneescolaire, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'annee_scolaire_id' })
  annee_scolaire: anneescolaire;
}
