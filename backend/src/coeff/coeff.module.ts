import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CoefficientClasse } from "./coeff.entity";
import { CoefficientClasseService } from "./coeff.service";
import { CoefficientClasseController } from "./coeff.controller";
import { Classe } from "../classe/classe.entity";
import { Matiere } from "../matieres/matiere.entity";
import { createTenantRepositoryProvider } from "../tenant/tenant-repository.provider";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [
    CoefficientClasseService,
    createTenantRepositoryProvider(CoefficientClasse),
    createTenantRepositoryProvider(Classe),
    createTenantRepositoryProvider(Matiere),
  ],
  controllers: [CoefficientClasseController],
})
export class CoefficientClasseModule {}