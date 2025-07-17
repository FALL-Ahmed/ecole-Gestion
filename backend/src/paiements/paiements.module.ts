// paiements.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaiementController } from './paiements.controller';
import { PaiementService } from './paiements.service';
import { RappelPaiementService } from './rappel-paiement.service';
import { Paiement } from './paiements.entity';
import { TwilioModule } from '../twilo/twilio.module';
import { Inscription } from '../inscription/inscription.entity';
import { EtablissementInfoModule } from '../etablissement/etablissement-info.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Paiement, Inscription]),
    TwilioModule,
    EtablissementInfoModule, // Module contenant EtablissementInfoService
  ],
  controllers: [PaiementController],
  providers: [
    PaiementService,
    RappelPaiementService,
  ],
  exports: [
    PaiementService,
    RappelPaiementService, // Ajoutez cette ligne pour exporter le service
  ],
})
export class PaiementsModule {}