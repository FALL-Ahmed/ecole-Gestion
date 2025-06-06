import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Classe } from './classe.entity';
import { ClasseService } from './classe.service';
import { ClasseController } from './classe.controller';
import { AnneeAcademiqueModule } from '../annee-academique/annee-academique.module'; // Chemin correct

@Module({
  imports: [
    TypeOrmModule.forFeature([Classe]),
    AnneeAcademiqueModule, // Importez le module plutôt que juste l'entité
  ],
  providers: [ClasseService],
  controllers: [ClasseController],
  exports: [ClasseService],
})
export class ClasseModule {}