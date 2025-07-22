import { Module, forwardRef } from '@nestjs/common';
import { Classe } from './classe.entity';
import { ClasseService } from './classe.service';
import { ClasseController } from './classe.controller';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
 imports: [forwardRef(() => AuthModule)],
  providers: [
    ClasseService,
    createTenantRepositoryProvider(Classe),
    createTenantRepositoryProvider(anneescolaire),
  ],

  controllers: [ClasseController],
})
export class ClasseModule {}