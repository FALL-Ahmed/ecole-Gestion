import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { anneescolaire } from './annee-academique.entity';
import { AnneeAcademiqueService } from './annee-academique.service';
import { AnneeAcademiqueController } from './annee-academique.controller';

@Module({
  imports: [TypeOrmModule.forFeature([anneescolaire])],
  providers: [AnneeAcademiqueService],
  controllers: [AnneeAcademiqueController],
  exports: [AnneeAcademiqueService],
})
export class AnneeAcademiqueModule {}
