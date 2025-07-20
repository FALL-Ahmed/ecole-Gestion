// rappel-paiement.module.ts
import { Module } from '@nestjs/common';
import { RappelPaiementService } from './rappel-paiement.service';
import { TwilioModule } from '../twilo/twilio.module';
import { PaiementsModule } from './paiements.module';
import { EtablissementInfoModule } from '../etablissement/etablissement-info.module'; // Ajout important

@Module({
  imports: [
    PaiementsModule,
    TwilioModule,
    EtablissementInfoModule, // Importation cruciale
  ],
  providers: [RappelPaiementService],
  exports: [RappelPaiementService],
})
export class RappelPaiementModule {}