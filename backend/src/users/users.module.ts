import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { Classe } from '../classe/classe.entity';
import { ParentModule } from '../central/parent.module';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { UtilisateurBloc } from './utilisateur-bloc.entity';
import { Bloc } from '../bloc/bloc.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ParentModule,
    forwardRef(() => AuthModule), // Break the circular dependency
  ],
  providers: [
    UsersService,
    createTenantRepositoryProvider(User),
    createTenantRepositoryProvider(UtilisateurBloc),
    createTenantRepositoryProvider(Classe),
    createTenantRepositoryProvider(anneescolaire),
    createTenantRepositoryProvider(Bloc),
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
