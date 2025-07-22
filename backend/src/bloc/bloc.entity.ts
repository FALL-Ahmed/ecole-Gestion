// src/bloc/bloc.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Classe } from '../classe/classe.entity';
import { Inscription } from '../inscription/inscription.entity';
import { Evaluation } from '../evaluation/evaluation.entity';
import { Note } from '../note/note.entity';
import { Chapitre } from '../chapitre/chapitre.entity';
import { EmploiDuTemps } from '../emploidutemps/emploidutemps.entity';
import { ExceptionEmploiDuTemps } from '../exceptionemploidutemps/exceptionemploidutemps.entity';
import { Paiement } from '../paiements/paiements.entity';
import { UtilisateurBloc } from '../users/utilisateur-bloc.entity';

@Entity('blocs')
export class Bloc {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  nom: string;

  @Column({ type: 'text', nullable: true })
  adresse: string;

  @Column({ length: 20, nullable: true })
  telephone: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Exemple de relation inverse (optionnel mais utile)
  @OneToMany(() => Classe, classe => classe.bloc)
  classes: Classe[];

  @OneToMany(() => Inscription, inscription => inscription.bloc)
  inscriptions: Inscription[];

  @OneToMany(() => Evaluation, evaluation => evaluation.bloc)
  evaluations: Evaluation[];

  @OneToMany(() => Note, note => note.bloc)
  notes: Note[];

  @OneToMany(() => Chapitre, chapitre => chapitre.bloc)
  chapitres: Chapitre[];

  @OneToMany(() => EmploiDuTemps, emploiDuTemps => emploiDuTemps.bloc)
  emploiDuTemps: EmploiDuTemps[];

  @OneToMany(() => ExceptionEmploiDuTemps, exception => exception.bloc)
  exceptionsEmploiDuTemps: ExceptionEmploiDuTemps[];

  @OneToMany(() => Paiement, paiement => paiement.bloc)
  paiements: Paiement[];

  @OneToMany(() => UtilisateurBloc, acces => acces.bloc)
  accesUtilisateurs: UtilisateurBloc[];
}
