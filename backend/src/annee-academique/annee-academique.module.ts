import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { anneescolaire } from './annee-academique.entity'; // Utilisez le même nom que votre entité
import { AnneeAcademiqueService } from './annee-academique.service';
import { AnneeAcademiqueController } from './annee-academique.controller';

@Module({
  imports: [TypeOrmModule.forFeature([anneescolaire])], // Utilisez le même nom ici
  providers: [AnneeAcademiqueService],
  controllers: [AnneeAcademiqueController],
  exports: [AnneeAcademiqueService, TypeOrmModule], // Exportez TypeOrmModule pour que les repositories soient disponibles ailleurs
})
export class AnneeAcademiqueModule {}