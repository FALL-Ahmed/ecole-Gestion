import { Module } from '@nestjs/common';
import { ProfessorAbsence } from './professor-absence.entity';
import { ProfessorAbsencesController } from './professor-absence.controller';
import { ProfessorAbsencesService } from './professor-absence.service';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
  imports: [],
  controllers: [ProfessorAbsencesController],
  providers: [
    ProfessorAbsencesService,
    createTenantRepositoryProvider(ProfessorAbsence),
  ],
})
export class ProfessorAbsencesModule {}
