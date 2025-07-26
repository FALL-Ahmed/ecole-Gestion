import { Module, forwardRef } from '@nestjs/common';
import { BlocService } from './bloc.service';
import { BlocController } from './bloc.controller';
import { Bloc } from './bloc.entity';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { AuthModule } from '../auth/auth.module';
import { UtilisateurBloc } from '../users/utilisateur-bloc.entity';

@Module({
  imports: [
    forwardRef(() => AuthModule),
  ],
  controllers: [BlocController],
  providers: [
    BlocService,
    createTenantRepositoryProvider(Bloc),
    createTenantRepositoryProvider(UtilisateurBloc),
  ],
  exports: [BlocService],
})
export class BlocModule {}
