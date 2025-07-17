// disciplinary-record.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Entity('disciplinary_records')
export class DisciplinaryRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' }) // Spécifie le nom de colonne
  student: User;

  @ManyToOne(() => Classe)
  @JoinColumn({ name: 'class_id' }) // Spécifie le nom de colonne
  class: Classe;

  @ManyToOne(() => anneescolaire)
  @JoinColumn({ name: 'school_year_id' }) // Spécifie le nom de colonne
  schoolYear: anneescolaire;

  @Column({ type: 'text' })
  reason: string;

  @CreateDateColumn()
  date: Date;
}