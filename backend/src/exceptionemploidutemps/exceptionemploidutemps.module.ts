// src/exception-emploi-du-temps/exception-emploi-du-temps.module.ts
import { Module } from '@nestjs/common';
import { ExceptionEmploiDuTempsService } from './exceptionemploidutemps.service';
import { ExceptionEmploiDuTempsController } from './exceptionemploidutemps.controller';
import { ExceptionEmploiDuTemps } from './exceptionemploidutemps.entity';
import { Classe } from '../classe/classe.entity';
import { Matiere } from '../matieres/matiere.entity';
import { User } from '../users/user.entity';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { Inscription } from '../inscription/inscription.entity';

@Module({
  imports: [],
  controllers: [ExceptionEmploiDuTempsController],
  providers: [
    ExceptionEmploiDuTempsService,
    createTenantRepositoryProvider(ExceptionEmploiDuTemps),
    createTenantRepositoryProvider(Classe),
    createTenantRepositoryProvider(Matiere),
    createTenantRepositoryProvider(User),
    createTenantRepositoryProvider(Inscription),
  ],
})
export class ExceptionEmploiDuTempsModule {}
