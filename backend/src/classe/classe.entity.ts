import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Inscription } from '../inscription/inscription.entity';

export enum Niveau {
  PRIMAIRE = 'primaire',
  COLLEGE = 'collège',
  LYCEE = 'lycée',
}

@Entity()
export class Classe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  nom: string;

  @Column({
    type: 'enum',
    enum: Niveau,
  })
  niveau: Niveau;

  @OneToMany(() => Inscription, (inscription) => inscription.classe)
  inscriptions: Inscription[];
}
