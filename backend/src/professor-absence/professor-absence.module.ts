import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorAbsence } from './professor-absence.entity';
import { ProfessorAbsencesController } from './professor-absence.controller';
import { ProfessorAbsencesService } from './professor-absence.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfessorAbsence])],
  controllers: [ProfessorAbsencesController],
  providers: [ProfessorAbsencesService],
})
export class ProfessorAbsencesModule {}

