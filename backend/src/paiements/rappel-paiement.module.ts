// rappel-paiement.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RappelPaiementService } from './rappel-paiement.service';
import { TwilioModule } from '../twilo/twilio.module';
import { PaiementsModule } from './paiements.module';
import { EtablissementInfoModule } from '../etablissement/etablissement-info.module'; // Ajout important
import { Paiement } from './paiements.entity'; // Si nécessaire pour les repositories

@Module({
  imports: [
    TypeOrmModule.forFeature([Paiement]), // Si le service utilise TypeORM directement
    PaiementsModule,
    TwilioModule,
    EtablissementInfoModule, // Importation cruciale
  ],
  providers: [RappelPaiementService],
  exports: [RappelPaiementService],
})
export class RappelPaiementModule {}