import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EcolesService } from './ecoles.service';
import { Ecole } from './ecole.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Ecole], 'central')],
  providers: [EcolesService],
  exports: [EcolesService], // Exporter pour que le module Admin puisse l'utiliser
})
export class EcolesModule {}

