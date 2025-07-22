import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from 'src/users/user.entity'; // This is correct for professeur
import { anneescolaire } from 'src/annee-academique/annee-academique.entity';
import { Bloc } from '../bloc/bloc.entity';

export enum StatutPaiement {
  NON_PAYE = 'Non Payé',
  PARTIEL = 'Partiel',
  PAYE = 'Payé',
}

@Entity('paiements')
@Index(['eleveId', 'anneeScolaireId', 'mois'], { unique: true })
export class Paiement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  mois: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Montant officiel à payer' })
  montantAttendu: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Montant total déjà versé' })
  montantPaye: number;

  @Column({ type: 'enum', enum: StatutPaiement, default: StatutPaiement.NON_PAYE })
  statut: StatutPaiement;

  @Column({ type: 'timestamp', nullable: true, name: 'dateDernierPaiement' })
  dateDernierPaiement: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  eleveId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eleveId' })
  eleve: User;

  @Column()
  anneeScolaireId: number;

  @ManyToOne(() => anneescolaire, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'anneeScolaireId' })
  anneeScolaire: anneescolaire;

    @Column({ name: 'bloc_id' })
  blocId: number;

  @ManyToOne(() => Bloc, bloc => bloc.paiements, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'bloc_id' })
  bloc: Bloc;
}

