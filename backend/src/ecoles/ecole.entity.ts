import { Parent } from '../central/parent.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ecoles')
export class Ecole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  nom_etablissement: string;

  @Column({ length: 100, unique: true })
  sous_domaine: string;

  @Column({ length: 100, unique: true })
  db_name: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

