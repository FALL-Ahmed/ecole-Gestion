import { Module, forwardRef } from '@nestjs/common';
import { InscriptionService } from './inscription.service';
import { InscriptionController } from './inscription.controller';
import { Inscription } from './inscription.entity';
import { User } from '../users/user.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { Classe } from '../classe/classe.entity';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { UtilisateurBloc } from '../users/utilisateur-bloc.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [
    InscriptionService,
    createTenantRepositoryProvider(Inscription),
    createTenantRepositoryProvider(User),
    createTenantRepositoryProvider(Classe),
    createTenantRepositoryProvider(anneescolaire),
    createTenantRepositoryProvider(UtilisateurBloc),
  ],
  controllers: [InscriptionController],
})
export class InscriptionModule {}
