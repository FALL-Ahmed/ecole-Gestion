import { Injectable, Logger } from '@nestjs/common';
import { PaiementService } from '../paiements/paiements.service';
import { TwilioService } from '../twilo/twilio.service';
import { EtablissementInfoService } from '../etablissement/etablissement-info.service';

@Injectable()
export class RappelPaiementService {
  private readonly logger = new Logger(RappelPaiementService.name);

  constructor(
    private readonly paiementService: PaiementService,
    private readonly twilioService: TwilioService,
    private readonly etablissementInfoService: EtablissementInfoService,
  ) {}

  // Dans rappel-paiement.service.ts
async envoyerRappelManuel(eleveId: number, mois: string) {
  try {
    const { status, paiement, montantRestant } = await this.paiementService.getPaymentStatus(eleveId, mois);
    const { schoolName, schoolPhone } = await this.etablissementInfoService.getNotificationDetails();

    // Cas 1: Aucun enregistrement existe - récupérer les infos de base
    if (status === 'not-exists') {
      const eleveInfo = await this.paiementService.getEleveInfo(eleveId);
      
      if (!eleveInfo?.tuteurTelephone) {
        return {
          success: false,
          message: 'Numéro de téléphone du tuteur non disponible'
        };
      }

      await this.envoyerNotificationNonPaye(
        eleveInfo.tuteurTelephone.trim(),
        mois,
        eleveInfo.prenom,
        eleveInfo.nom,
        eleveInfo.montantAttendu || 0,
        schoolName,
        schoolPhone
      );
      return {
        success: true,
        message: `Notification pour paiement manquant envoyée pour ${mois}`
      };
    }

    // Validation pour les autres cas
    if (!paiement?.eleve?.tuteurTelephone) {
      return {
        success: false,
        message: 'Numéro de téléphone du tuteur non disponible'
      };
    }

    const tuteurTelephone = paiement.eleve.tuteurTelephone.trim();

    // Cas 2: Déjà payé complètement
    if (status === 'paye') {
      await this.envoyerNotificationPaye(
        tuteurTelephone,
        mois,
        paiement.eleve.prenom,
        paiement.eleve.nom,
        schoolName,
        schoolPhone
      );
      return {
        success: true,
        message: `Notification de paiement complet envoyée pour ${mois}`
      };
    }

    // Cas 3: Paiement partiel
    if (status === 'partiel') {
      await this.envoyerNotificationPartiel(
        tuteurTelephone,
        mois,
        paiement.eleve.prenom,
        paiement.eleve.nom,
        paiement.montantPaye,
        paiement.montantAttendu,
        montantRestant ?? paiement.montantAttendu - paiement.montantPaye,
        schoolName,
        schoolPhone
      );
    } 
    // Cas 4: Non payé (mais enregistrement existe)
    else {
      await this.envoyerNotificationNonPaye(
        tuteurTelephone,
        mois,
        paiement.eleve.prenom,
        paiement.eleve.nom,
        paiement.montantAttendu,
        schoolName,
        schoolPhone
      );
    }

    return {
      success: true,
      message: `Notification envoyée pour ${mois}`
    };

  } catch (error) {
    this.logger.error(`Erreur d'envoi de rappel`, error.stack);
    throw new Error(`Échec de l'envoi: ${error.message}`);
  }
}
  private async envoyerNotificationNonPaye(
    telephone: string,
    mois: string,
    prenom: string,
    nom: string,
    montantAttendu: number,
    schoolName: string | null,
    schoolPhone: string | null
  ) {
    const ecole = (schoolName || "L'Administration Scolaire").trim();
    const contact = (schoolPhone || '').trim();

    const message = `📣 *RAPPEL DE PAIEMENT EN RETARD* 📣

Bonjour Cher Parent,

Nous vous informons que le paiement scolaire du mois de *${mois}* pour *${prenom} ${nom}* n'a pas encore été effectué.

🔴 *Statut* : IMPAYÉ
💰 *Montant dû* : ${montantAttendu} MRU
⏳ *Date limite dépassée* : 5 ${mois}

*Veuillez régulariser au plus vite :*
1. Espèce au secrétariat
2. Paiement mobile (BANKILY - MASRIVI - SEDDAD)

${contact ? `📞 Contactez-nous : ${contact}\n` : ''}

*Un retard de paiement peut entraîner des mesures administratives.*

Cordialement,
*${ecole}*`.trim();

    await this.twilioService.sendWhatsAppMessage(telephone, message);
  }

  private async envoyerNotificationPartiel(
    telephone: string,
    mois: string,
    prenom: string,
    nom: string,
    montantPaye: number,
    montantAttendu: number,
    montantRestant: number,
    schoolName: string | null,
    schoolPhone: string | null
  ) {
    const ecole = (schoolName || "L'Administration Scolaire").trim();
    const contact = (schoolPhone || '').trim();

    const message = `📣 *RAPPEL DE PAIEMENT PARTIEL* 📣

Bonjour Cher Parent,

Nous avons bien reçu un paiement partiel pour *${prenom} ${nom}* concernant le mois de *${mois}*.

🟠 *Statut* : PARTIEL
├ 💰 Montant attendu : ${montantAttendu} MRU
├ ✔️ Montant payé : ${montantPaye} MRU
└ ⚠️ Reste à payer : ${montantRestant} MRU

⏳ *Date limite* : 15 ${mois}

Modes de paiement :
1. Espèce au secrétariat
2. Mobile (BANKILY - MASRIVI - SEDDAD)

${contact ? `📞 Pour toute question : ${contact}\n` : ''}

Merci de compléter le solde dès que possible.

Cordialement,
*${ecole}*`.trim();

    await this.twilioService.sendWhatsAppMessage(telephone, message);
  }

  private async envoyerNotificationPaye(
    telephone: string,
    mois: string,
    prenom: string,
    nom: string,
    schoolName: string | null,
    schoolPhone: string | null
  ) {
    const ecole = (schoolName || "L'Administration Scolaire").trim();
    const contact = (schoolPhone || '').trim();

    const message = `📣 *ACCUSÉ DE PAIEMENT* 📣

Bonjour Cher Parent,

Le paiement scolaire du mois de *${mois}* pour *${prenom} ${nom}* a été reçu en totalité.

🟢 *Statut* : PAYÉ
✅ Merci pour votre prompt paiement.

${contact ? `📞 Contact : ${contact}\n` : ''}

Cordialement,
*${ecole}*`.trim();

    await this.twilioService.sendWhatsAppMessage(telephone, message);
  }
}
