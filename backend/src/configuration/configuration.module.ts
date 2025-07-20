import { Module } from '@nestjs/common';
import { Configuration } from './configuration.entity';
import { ConfigurationService } from './configuration.service';
import { ConfigurationController } from './configuration.controller';
import { anneescolaire } from 'src/annee-academique/annee-academique.entity';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
  imports: [],
  controllers: [ConfigurationController],
  providers: [
    ConfigurationService,
    createTenantRepositoryProvider(Configuration),
    createTenantRepositoryProvider(anneescolaire),
  ],
})
export class ConfigurationModule {}
