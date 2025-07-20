import { Module } from '@nestjs/common';
import { anneescolaire } from './annee-academique.entity'; // Utilisez le même nom que votre entité
import { AnneeAcademiqueService } from './annee-academique.service';
import { AnneeAcademiqueController } from './annee-academique.controller';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
  imports: [],
  providers: [
    AnneeAcademiqueService,
    createTenantRepositoryProvider(anneescolaire),
  ],
  controllers: [AnneeAcademiqueController],
})
export class AnneeAcademiqueModule {}