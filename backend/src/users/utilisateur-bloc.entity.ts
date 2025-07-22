// src/users/utilisateur-bloc.entity.ts
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique, Column } from 'typeorm';
import { User } from './user.entity';
import { Bloc } from '../bloc/bloc.entity';

@Entity('utilisateurs_blocs')
@Unique(['utilisateur', 'bloc'])
export class UtilisateurBloc {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.accesBlocs, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: User;

  @Column({ name: 'bloc_id', nullable: false })
  blocId: number;

  @ManyToOne(() => Bloc, bloc => bloc.accesUtilisateurs, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'bloc_id' })
  bloc: Bloc;
}
