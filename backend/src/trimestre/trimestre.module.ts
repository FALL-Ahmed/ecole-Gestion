import { Module } from '@nestjs/common';
import { Trimestre } from './trimestre.entity';
import { TrimestreController } from './trimestre.controller';
import { TrimestreService } from './trimestre.service';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Module({
  imports: [],
  providers: [
    TrimestreService,
    createTenantRepositoryProvider(Trimestre),
    createTenantRepositoryProvider(anneescolaire),
  ],
  controllers: [TrimestreController],
})
export class TrimestreModule {}
