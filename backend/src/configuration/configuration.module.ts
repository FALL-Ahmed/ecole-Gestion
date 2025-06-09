import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Configuration } from './configuration.entity';
import { ConfigurationService } from './configuration.service';
import { ConfigurationController } from './configuration.controller';
import { anneescolaire } from 'src/annee-academique/annee-academique.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Configuration, anneescolaire])],
  controllers: [ConfigurationController],
  providers: [ConfigurationService],
})
export class ConfigurationModule {}
