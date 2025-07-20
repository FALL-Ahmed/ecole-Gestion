import { Module } from '@nestjs/common';
import { ChapitreService } from './chapitre.service';
import { ChapitreController } from './chapitre.controller';
import { Chapitre } from './chapitre.entity';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
 imports: [],
  providers: [
    ChapitreService,
    createTenantRepositoryProvider(Chapitre),
  ],
  controllers: [ChapitreController],
})
export class ChapitreModule {}
