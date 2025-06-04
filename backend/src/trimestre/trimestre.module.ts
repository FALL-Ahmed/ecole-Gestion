import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trimestre } from './trimestre.entity';
import { TrimestreController } from './trimestre.controller';
import { TrimestreService } from './trimestre.service';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trimestre, anneescolaire])],
  controllers: [TrimestreController],
  providers: [TrimestreService],
})
export class TrimestreModule {}
