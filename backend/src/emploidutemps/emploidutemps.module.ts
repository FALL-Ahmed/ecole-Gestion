// src/emploi-du-temps/emploi-du-temps.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { EmploiDuTempsService } from './emploidutemps.service';
import { EmploiDuTempsController } from './emploidutemps.controller';
import { EmploiDuTemps } from './emploidutemps.entity';
import { Classe } from '../classe/classe.entity'; // Import related entities if they are used in relations
import { Matiere } from '../matieres/matiere.entity';
import { User } from '../users/user.entity';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [EmploiDuTempsController],
  providers: [
    EmploiDuTempsService,
    createTenantRepositoryProvider(EmploiDuTemps),
    createTenantRepositoryProvider(Classe),
    createTenantRepositoryProvider(Matiere),
    createTenantRepositoryProvider(User),
  ],
})
export class EmploiDuTempsModule {}