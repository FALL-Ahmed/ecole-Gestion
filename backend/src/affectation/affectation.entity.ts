import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column } from "typeorm";
import { Classe } from "../classe/classe.entity";
import { Matiere } from "../matieres/matiere.entity";
import { User } from "../users/user.entity";
import { anneescolaire } from "../annee-academique/annee-academique.entity";


@Entity()
export class Affectation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "professeur_id" })
  professeur: User;

  @ManyToOne(() => Matiere)
  @JoinColumn({ name: "matiere_id" })
  matiere: Matiere;

  @ManyToOne(() => Classe)
  @JoinColumn({ name: "classe_id" })
  classe: Classe;

  @ManyToOne(() => anneescolaire)
 @JoinColumn({ name: "annee_id" })
 annee_scolaire: anneescolaire;
}