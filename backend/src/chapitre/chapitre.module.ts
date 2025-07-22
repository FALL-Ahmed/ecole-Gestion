import { Module } from '@nestjs/common';
import { ChapitreService } from './chapitre.service';
import { ChapitreController } from './chapitre.controller';
import { Chapitre } from './chapitre.entity';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { Bloc } from '../bloc/bloc.entity';
import { Matiere } from '../matieres/matiere.entity';
import { Classe } from '../classe/classe.entity';
import { forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

@Module({
 imports: [forwardRef(() => AuthModule)],
  providers: [
    ChapitreService,
    createTenantRepositoryProvider(Chapitre),
    createTenantRepositoryProvider(Bloc),
    createTenantRepositoryProvider(Matiere),
    createTenantRepositoryProvider(Classe),
  ],
  controllers: [ChapitreController],
})
export class ChapitreModule {}
