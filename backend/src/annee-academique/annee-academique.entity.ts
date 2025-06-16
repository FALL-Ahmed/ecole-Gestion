import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Classe } from '../classe/classe.entity';
import { Absence } from '../absence/absence.entity'; // Adaptez le chemin


@Entity('anneescolaire')
export class anneescolaire {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  libelle: string;

  @Column({ name: 'date_debut' })
  date_debut: string;

  @Column({ name: 'date_fin' })
  date_fin: string;

  @OneToMany(() => Classe, (classe) => classe.anneeScolaire)
  classes: Classe[];

  @OneToMany(() => Absence, (absence) => absence.anneeScolaire)
absences: Absence[];

}
