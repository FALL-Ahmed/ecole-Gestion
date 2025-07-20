import { Module } from '@nestjs/common';
import { EtablissementInfo } from './etablissement-info.entity';
import { EtablissementInfoService } from './etablissement-info.service';
import { EtablissementInfoController } from './etablissement-info.controller';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
  imports: [],
  providers: [
    EtablissementInfoService,
    createTenantRepositoryProvider(EtablissementInfo),
  ],
  controllers: [EtablissementInfoController],
  exports: [EtablissementInfoService], // Exporter le service si d'autres modules en ont besoin
})
export class EtablissementInfoModule {}
