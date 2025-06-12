// src/emploi-du-temps/emploi-du-temps.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmploiDuTempsService } from './emploidutemps.service';
import { EmploiDuTempsController } from './emploidutemps.controller';
import { EmploiDuTemps } from './emploidutemps.entity';
import { Classe } from '../classe/classe.entity'; // Import related entities if they are used in relations
import { Matiere } from '../matieres/matiere.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmploiDuTemps, Classe, Matiere, User]), // Register entities with TypeORM
  ],
  controllers: [EmploiDuTempsController],
  providers: [EmploiDuTempsService],
  exports: [EmploiDuTempsService], // Export if other modules need to use EmploiDuTempsService
})
export class EmploiDuTempsModule {}