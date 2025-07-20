import { Module } from '@nestjs/common';
import { AbsenceService } from './absence.service';
import { AbsenceController } from './absence.controller';
import { Absence } from './absence.entity';
import { AuditLogModule } from '../historique/historique.module';
import { User } from '../users/user.entity'; // ✅ importer l'entité User
import { Classe } from '../classe/classe.entity'; // ✅ si tu l’utilises dans le service
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
  imports: [
    AuditLogModule, // Importé car AbsenceService l'utilise
  ],
  providers: [
    AbsenceService,
    createTenantRepositoryProvider(Absence),
    createTenantRepositoryProvider(User),
    createTenantRepositoryProvider(Classe),
  ],
  controllers: [AbsenceController],
  exports: [AbsenceService],
})
export class AbsenceModule {}
