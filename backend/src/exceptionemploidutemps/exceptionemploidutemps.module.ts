// src/exception-emploi-du-temps/exception-emploi-du-temps.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExceptionEmploiDuTempsService } from './exceptionemploidutemps.service';
import { ExceptionEmploiDuTempsController } from './exceptionemploidutemps.controller';
import { ExceptionEmploiDuTemps } from './exceptionemploidutemps.entity';
import { Classe } from '../classe/classe.entity';
import { Matiere } from '../matieres/matiere.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExceptionEmploiDuTemps, Classe, Matiere, User]), // Enregistrer les entités avec TypeORM
  ],
  controllers: [ExceptionEmploiDuTempsController],
  providers: [ExceptionEmploiDuTempsService],
  exports: [ExceptionEmploiDuTempsService], // Exporter si d'autres modules ont besoin d'utiliser ExceptionEmploiDuTempsService
})
export class ExceptionEmploiDuTempsModule {}
