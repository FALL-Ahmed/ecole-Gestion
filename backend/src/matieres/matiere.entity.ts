import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'; // Import OneToMany
import { Absence } from '../absence/absence.entity'; // Adaptez le chemin
import { Chapitre } from '../chapitre/chapitre.entity'; // Assurez-vous que le chemin est correct



@Entity('matiere')
export class Matiere {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @OneToMany(() => Chapitre, chapitre => chapitre.matiere)
  chapitres: Chapitre[];
    @OneToMany(() => Absence, (absence: Absence) => absence.matiere) // Typer le paramètre absence
  absences: Absence[];
}