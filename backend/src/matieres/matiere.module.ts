import { Module } from '@nestjs/common';
import { Matiere } from './matiere.entity';
import { MatiereService } from './matiere.service';
import { MatiereController } from './matiere.controller';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
imports: [],
  providers: [
    MatiereService,
    createTenantRepositoryProvider(Matiere),
  ],
  controllers: [MatiereController],
})
export class MatiereModule {}