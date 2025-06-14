import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Classe } from "../classe/classe.entity";
import { Matiere } from "../matieres/matiere.entity";

@Entity('coefficientclasse')
export class CoefficientClasse {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Classe)
  @JoinColumn({ name: "classe_id" })
  classe: Classe;

  @ManyToOne(() => Matiere)
  @JoinColumn({ name: "matiere_id" })
  matiere: Matiere;

  @Column("int")
  coefficient: number;
}