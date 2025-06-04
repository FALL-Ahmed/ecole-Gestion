import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('matiere')
export class Matiere {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;
}