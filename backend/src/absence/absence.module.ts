import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbsenceService } from './absence.service';
import { AbsenceController } from './absence.controller';
import { Absence } from './absence.entity';
import { AuditLogModule } from '../historique/historique.module';
import { User } from '../users/user.entity'; // ✅ importer l'entité User
import { Classe } from '../classe/classe.entity'; // ✅ si tu l’utilises dans le service
import { UsersModule } from '../users/users.module'; // ✅ importer le module Users

@Module({
  imports: [
    TypeOrmModule.forFeature([Absence, User, Classe]), // ✅ inclure ici User et Classe
    AuditLogModule,
    UsersModule, // ✅ importer le module pour que les repositories soient injectables
  ],
  controllers: [AbsenceController],
  providers: [AbsenceService],
  exports: [AbsenceService],
})
export class AbsenceModule {}
