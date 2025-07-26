import { Injectable, BadRequestException, Scope, Inject, UnauthorizedException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Paiement, StatutPaiement } from './paiements.entity';
import { Inscription } from '../inscription/inscription.entity';
import { FindPaiementsQueryDto } from './dto/find-paiements-query.dto';
import { EnregistrerPaiementDto } from './dto/enregistrer-paiement.dto';
import { User, UserRole } from '../users/user.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class PaiementService {
  private readonly logger = new Logger(PaiementService.name);

  constructor(
    @InjectRepository(Paiement)
    private readonly paiementRepository: Repository<Paiement>,
    @InjectRepository(Inscription)
    private readonly inscriptionRepository: Repository<Inscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private getBlocId(): number | null {
    const user = this.request.user as any;

    if (user && user.blocId) {
      return user.blocId;
    }

    const queryBlocId = this.request.query.blocId;
    if (queryBlocId && !isNaN(parseInt(queryBlocId as string, 10))) {
      return parseInt(queryBlocId as string, 10);
    }

    this.logger.warn(`[getBlocId] Aucun blocId trouvé pour l'utilisateur ${user?.email}.`);
    return null;
  }

  private async verifyParentAccess(eleveId: number): Promise<void> {
    const user = this.request.user as any;

    // This check is only relevant for parents. Admins/profs are scoped by blocId.
    if (user.role !== 'parent') {
      return;
    }

    const parentId = user.id;
    const student = await this.userRepository.findOne({
      where: { id: eleveId },
    });

    if (!student || student.parentId !== parentId) {
      throw new ForbiddenException("Accès non autorisé aux données de cet élève.");
    }
  }

  async findAllByClasse(query: FindPaiementsQueryDto): Promise<any[]> {
    const { classeId, anneeScolaireId } = query;
    const blocId = this.getBlocId();
    if (blocId === null) return [];

    const inscriptions = await this.inscriptionRepository.find({
      where: {
        classe: { id: +classeId },
        annee_scolaire: { id: +anneeScolaireId },
        utilisateur: { role: UserRole.ETUDIANT },
        blocId: blocId, // Security check
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
        blocId: blocId, // Security check
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
  const blocId = this.getBlocId();
  if (blocId === null) {
    throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
  }
  // Cherche un paiement existant
  const paiement = await this.paiementRepository.findOne({
    where: { eleveId, mois, blocId },
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
  const blocId = this.getBlocId();
  if (blocId === null) {
    throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
  }
  
  const paiement = await this.paiementRepository.findOne({
    where: { id, blocId } // Security check
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
  const blocId = this.getBlocId();
  if (blocId === null) {
    return null;
  }
  const inscription = await this.inscriptionRepository.findOne({
    // Find the active inscription for the student in the current bloc
    where: { utilisateurId: eleveId, blocId: blocId, actif: true },
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
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    let paiement = await this.paiementRepository.findOne({
      // Security check
      where: { eleveId, anneeScolaireId, mois, blocId },
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
        blocId: blocId, // Enforce blocId
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

  async findHistoriqueByEleve(
    eleveId: number,
    anneeScolaireId: number,
  ): Promise<Paiement[]> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      return [];
    }

    await this.verifyParentAccess(eleveId);

    return this.paiementRepository.find({
      where: {
        eleveId: eleveId,
        anneeScolaireId: anneeScolaireId,
        blocId: blocId, // Security check
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }
}
