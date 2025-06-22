import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtablissementInfo } from './etablissement-info.entity';
import { EtablissementInfoService } from './etablissement-info.service';
import { EtablissementInfoController } from './etablissement-info.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EtablissementInfo])],
  providers: [EtablissementInfoService],
  controllers: [EtablissementInfoController],
  exports: [EtablissementInfoService], // Exporter le service si d'autres modules en ont besoin
})
export class EtablissementInfoModule {}
