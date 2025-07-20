import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { Classe } from '../classe/classe.entity';
import { ParentModule } from '../central/parent.module'; // chemin correct
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
  imports: [
    ParentModule,  // <--- IMPORTANT ici
  ],
  providers: [
    UsersService,
    createTenantRepositoryProvider(User),
    createTenantRepositoryProvider(Classe),
    createTenantRepositoryProvider(anneescolaire),
  ],
  controllers: [UsersController],
  exports: [UsersService],  // <--- Supprime ParentModule d'ici !
})
export class UsersModule {}
