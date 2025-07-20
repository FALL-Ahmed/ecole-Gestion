import { Module } from '@nestjs/common';
import { InscriptionService } from './inscription.service';
import { InscriptionController } from './inscription.controller';
import { Inscription } from './inscription.entity';
import { User } from '../users/user.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { Classe } from '../classe/classe.entity';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
  imports: [
    // Les imports de modules qui exportent des services ne sont plus nécessaires
    // car les repositories sont maintenant fournis dynamiquement.
  ],
  providers: [
    InscriptionService,
    createTenantRepositoryProvider(Inscription),
    createTenantRepositoryProvider(User),
    createTenantRepositoryProvider(Classe),
    createTenantRepositoryProvider(anneescolaire),
  ],
  controllers: [InscriptionController],
})
export class InscriptionModule {}
