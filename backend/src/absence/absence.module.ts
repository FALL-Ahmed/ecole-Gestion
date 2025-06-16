import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbsenceService } from './absence.service';
import { AbsenceController } from './absence.controller';
import { Absence } from './absence.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([Absence]),
   
  ],
  controllers: [AbsenceController],
  providers: [AbsenceService],
  exports: [AbsenceService], // Exportez si d'autres modules utilisent AbsenceService
})
export class AbsenceModule {}
