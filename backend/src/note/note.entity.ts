// src/note/note.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Evaluation } from 'src/evaluation/evaluation.entity';
import { User } from 'src/users/user.entity';

@Entity('note')
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Evaluation, (evaluation) => evaluation.notes, { onDelete: 'CASCADE' }) // Ajout de (evaluation) => evaluation.notes
  @JoinColumn({ name: 'evaluation_id' })
  evaluation: Evaluation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etudiant_id' })
  etudiant: User;

  @Column({ type: 'float' })
  note: number;
}