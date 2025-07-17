import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Paiement, StatutPaiement } from './paiements.entity';
import { Inscription } from '../inscription/inscription.entity';
import { FindPaiementsQueryDto } from './dto/find-paiements-query.dto';
import { EnregistrerPaiementDto } from './dto/enregistrer-paiement.dto';
import { UserRole } from '../users/user.entity';
@Injectable()
export class PaiementService {
  constructor(
    @InjectRepository(Paiement)
    private readonly paiementRepository: Repository<Paiement>,
    @InjectRepository(Inscription)
    private readonly inscriptionRepository: Repository<Inscription>,
  ) {}

  async findAllByClasse(query: FindPaiementsQueryDto): Promise<any[]> {
    const { classeId, anneeScolaireId } = query;

    const inscriptions = await this.inscriptionRepository.find({
      where: {
        classe: { id: +classeId },
        annee_scolaire: { id: +anneeScolaireId },
        utilisateur: { role: UserRole.ETUDIANT },
      },
      select: ['utilisateurId'],
    });

    if (inscriptions.length === 0) {
      return [];
    }

    const eleveIds = inscriptions.map((i) => i.utilisateurId);

    const paiements = await this.paiementRepository.find({
      where: {
        eleveId: In(eleveIds),
        anneeScolaireId: +anneeScolaireId,
      },
    });

    // Enrichir les données avec le reste à payer pour le frontend
    return paiements.map(p => ({
      ...p,
      resteAPayer: Math.max(0, Number(p.montantAttendu) - Number(p.montantPaye)).toFixed(2)
    }));
  }

async getPaymentStatus(eleveId: number, mois: string): Promise<{
  status: 'not-exists' | 'non-paye' | 'partiel' | 'paye';
  paiement?: Paiement;
  montantRestant?: number;
}> {
  // Cherche un paiement existant
  const paiement = await this.paiementRepository.findOne({
    where: { eleveId, mois },
    relations: ['eleve']
  });

  if (!paiement) {
    return { status: 'not-exists' };
  }

  const montantRestant = paiement.montantAttendu - paiement.montantPaye;

  return {
    status: paiement.statut === StatutPaiement.PAYE ? 'paye' :
           paiement.statut === StatutPaiement.PARTIEL ? 'partiel' : 'non-paye',
    paiement,
    montantRestant
  };
}
async updatePaiement(id: number, dto: EnregistrerPaiementDto): Promise<Paiement> {
  const { eleveId, anneeScolaireId, mois, montantVerse, montantOfficiel } = dto;
  
  const paiement = await this.paiementRepository.findOne({
    where: { id }
  });

  if (!paiement) {
    throw new BadRequestException('Paiement non trouvé');
  }

  // Mettre à jour le montant attendu si fourni
  if (montantOfficiel) {
    paiement.montantAttendu = Number(montantOfficiel);
  }

  // Remplacer complètement le montant payé plutôt que de l'ajouter
  paiement.montantPaye = Number(montantVerse);

  if (paiement.montantPaye > paiement.montantAttendu) {
    throw new BadRequestException(
      `Le paiement (${paiement.montantPaye}) ne peut pas dépasser le montant attendu (${paiement.montantAttendu}).`,
    );
  }

  paiement.dateDernierPaiement = new Date();

  // Mettre à jour le statut
  if (paiement.montantPaye >= paiement.montantAttendu) {
    paiement.statut = StatutPaiement.PAYE;
  } else if (paiement.montantPaye > 0) {
    paiement.statut = StatutPaiement.PARTIEL;
  } else {
    paiement.statut = StatutPaiement.NON_PAYE;
  }

  return this.paiementRepository.save(paiement);
}

// Dans paiements.service.ts
async getEleveInfo(eleveId: number) {
  const inscription = await this.inscriptionRepository.findOne({
    where: { utilisateurId: eleveId },
    relations: ['utilisateur', 'classe']
  });

  if (!inscription) {
    return null;
  }

  return {
    tuteurTelephone: inscription.utilisateur?.tuteurTelephone,
    prenom: inscription.utilisateur?.prenom,
    nom: inscription.utilisateur?.nom,
    montantAttendu: inscription.classe?.frais_scolarite
  };
}

  async enregistrerPaiement(dto: EnregistrerPaiementDto): Promise<Paiement> {
    const { eleveId, anneeScolaireId, mois, montantVerse, montantOfficiel } = dto;

    let paiement = await this.paiementRepository.findOne({
      where: { eleveId, anneeScolaireId, mois },
    });

    if (!paiement) {
      if (!montantOfficiel) {
        throw new BadRequestException(
          'Le montant officiel est requis pour le premier paiement de ce mois.',
        );
      }
      paiement = this.paiementRepository.create({
        eleveId,
        anneeScolaireId,
        mois,
        montantAttendu: montantOfficiel,
        montantPaye: 0,
        statut: StatutPaiement.NON_PAYE,
      });
    }

    // Mettre à jour le montant attendu si fourni
    if (montantOfficiel) {
        paiement.montantAttendu = montantOfficiel;
    }

    const nouveauMontantPaye = Number(paiement.montantPaye) + Number(montantVerse);

    if (nouveauMontantPaye > Number(paiement.montantAttendu)) {
      throw new BadRequestException(
        `Le paiement total (${nouveauMontantPaye}) ne peut pas dépasser le montant attendu (${paiement.montantAttendu}).`,
      );
    }

    paiement.montantPaye = nouveauMontantPaye;
    paiement.dateDernierPaiement = new Date();

    // Mettre à jour le statut
    if (Number(paiement.montantPaye) >= Number(paiement.montantAttendu)) {
      paiement.statut = StatutPaiement.PAYE;
    } else if (paiement.montantPaye > 0) {
      paiement.statut = StatutPaiement.PARTIEL;
    } else {
      paiement.statut = StatutPaiement.NON_PAYE;
    }

    return this.paiementRepository.save(paiement);
  }
}

