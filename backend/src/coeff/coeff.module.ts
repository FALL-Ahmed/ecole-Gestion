import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CoefficientClasse } from "./coeff.entity";
import { CoefficientClasseService } from "./coeff.service";
import { CoefficientClasseController } from "./coeff.controller";
import { Classe } from "../classe/classe.entity";
import { Matiere } from "../matieres/matiere.entity";

@Module({
  imports: [TypeOrmModule.forFeature([CoefficientClasse, Classe, Matiere])],
  providers: [CoefficientClasseService],
  controllers: [CoefficientClasseController],
  exports: [CoefficientClasseService],
})
export class CoefficientClasseModule {}