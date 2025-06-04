import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Affectation } from './affectation.entity';
import { AffectationService } from './affectation.service';
import { AffectationController } from './affectation.controller';
import { User } from '../users/user.entity';
import { Matiere } from '../matieres/matiere.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity'; // <-- adapte le nom si besoin

@Module({
  imports: [
    TypeOrmModule.forFeature([Affectation, User, Matiere, Classe, anneescolaire]),
  ],
  providers: [AffectationService],
  controllers: [AffectationController],
  exports: [AffectationService],
})
export class AffectationModule {}