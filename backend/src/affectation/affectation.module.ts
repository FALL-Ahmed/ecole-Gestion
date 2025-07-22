import { Module } from '@nestjs/common';
import { Affectation } from './affectation.entity';
import { AffectationService } from './affectation.service';
import { AffectationController } from './affectation.controller';
import { User } from '../users/user.entity';
import { Matiere } from '../matieres/matiere.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity'; // <-- adapte le nom si besoin
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

@Module({
   imports: [forwardRef(() => AuthModule)],
  controllers: [AffectationController],
  providers: [
    AffectationService,
    createTenantRepositoryProvider(Affectation),
    createTenantRepositoryProvider(User),
    createTenantRepositoryProvider(Matiere),
    createTenantRepositoryProvider(Classe),
    createTenantRepositoryProvider(anneescolaire),
  ],

})
export class AffectationModule {}