import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity'; // Assurez-vous que le chemin est correct

@Entity('parents')
export class Parent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  nom: string;

  @Column({ type: 'varchar', length: 15, unique: true, nullable: false })
  telephone: string; // ex: +222XXXXXXXX

  @Column({ type: 'varchar', unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', select: false, nullable: false })
  mot_de_passe: string;

  @Column({ type: 'varchar', nullable: true })
  adresse: string;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'varchar', default: 'parent' })
  role: string;

  @CreateDateColumn({ name: 'date_creation' })
  dateCreation: Date;

  @UpdateDateColumn({ name: 'date_mise_a_jour' })
  dateMiseAJour: Date;

  // Relation avec les utilisateurs (enfants)
  @OneToMany(() => User, (user) => user.parent)
  enfants: User[];
}