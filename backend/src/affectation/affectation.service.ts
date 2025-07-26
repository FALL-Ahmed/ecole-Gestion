import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Scope,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Affectation } from './affectation.entity';
import { User } from '../users/user.entity';
import { Matiere } from '../matieres/matiere.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class AffectationService {
  private readonly logger = new Logger(AffectationService.name);

  constructor(
    @InjectRepository(Affectation)
    private affectationRepository: Repository<Affectation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Matiere)
    private matiereRepository: Repository<Matiere>,
    @InjectRepository(Classe)
    private classeRepository: Repository<Classe>,
    @InjectRepository(anneescolaire)
    private anneeRepository: Repository<anneescolaire>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private getBlocId(): number | null {
    const user = this.request.user as any;

    if (user && user.blocId) {
      this.logger.debug(`[getBlocId] blocId ${user.blocId} trouvé dans le token JWT.`);
      return user.blocId;
    }

    const queryBlocId = this.request.query.blocId;
    if (queryBlocId && !isNaN(parseInt(queryBlocId as string, 10))) {
      const blocId = parseInt(queryBlocId as string, 10);
      this.logger.debug(`[getBlocId] blocId ${blocId} trouvé dans les paramètres de la requête.`);
      return blocId;
    }

    this.logger.warn(`[getBlocId] Aucun blocId trouvé pour l'utilisateur ${user?.email}.`);
    return null;
  }

  async findAll(annee_scolaire_id?: number, classe_id?: number): Promise<Affectation[]> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      this.logger.warn("[findAll] Aucun blocId fourni, retour d'une liste vide.");
      return [];
    }

    const where: FindOptionsWhere<Affectation> = {};

    const classeFilter: FindOptionsWhere<Classe> = { blocId: blocId };
    if (classe_id) {
      classeFilter.id = classe_id;
    }
    where.classe = classeFilter;

    if (annee_scolaire_id) {
      where.annee_scolaire = { id: annee_scolaire_id };
    }

    return this.affectationRepository.find({
      where,
      relations: ['professeur', 'matiere', 'classe', 'annee_scolaire'],
    });
  }

  async findById(id: number): Promise<Affectation> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new NotFoundException(`Affectation avec l'ID ${id} non trouvée car aucun bloc n'est sélectionné.`);
    }

    const affectation = await this.affectationRepository.findOne({
      where: { id, classe: { blocId: blocId } },
      relations: ['professeur', 'matiere', 'classe', 'annee_scolaire'],
    });

    if (!affectation) {
      throw new NotFoundException(`Affectation avec l'ID ${id} non trouvée dans ce bloc.`);
    }

    return affectation;
  }

  async findByProfesseurId(professeurId: number, annee_scolaire_id?: number): Promise<Affectation[]> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      this.logger.warn("[findByProfesseurId] Aucun blocId fourni, retour d'une liste vide.");
      return [];
    }

    const where: FindOptionsWhere<Affectation> = {
      professeur: { id: professeurId },
      classe: { blocId: blocId },
    };

    if (annee_scolaire_id) {
      where.annee_scolaire = { id: annee_scolaire_id };
    }

    return this.affectationRepository.find({
      where,
      relations: ['professeur', 'matiere', 'classe', 'annee_scolaire'],
    });
  }

  async create(data: {
    professeur_id: number;
    matiere_id: number;
    classe_id: number;
    annee_scolaire_id: number;
  }): Promise<Affectation> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    const professeur = await this.userRepository.findOneBy({ id: data.professeur_id });
    if (!professeur) throw new NotFoundException('Professeur introuvable');

    const matiere = await this.matiereRepository.findOneBy({ id: data.matiere_id });
    if (!matiere) throw new NotFoundException('Matière introuvable');

    // Security check: ensure the class belongs to the user's bloc
    const classe = await this.classeRepository.findOneBy({ id: data.classe_id, blocId });
    if (!classe) {
      throw new ForbiddenException(`La classe avec l'ID ${data.classe_id} n'existe pas dans votre établissement.`);
    }

    const anneeScolaire = await this.anneeRepository.findOneBy({ id: data.annee_scolaire_id });
    if (!anneeScolaire) throw new NotFoundException('Année scolaire introuvable');

    const newAffectation = this.affectationRepository.create({
      professeur,
      matiere,
      classe,
      annee_scolaire: anneeScolaire,
    });

    return this.affectationRepository.save(newAffectation);
  }


  async delete(id: number): Promise<void> {
    // Security check: findById will throw if the affectation doesn't exist or doesn't belong to the user's bloc
    const affectationToDelete = await this.findById(id);

    await this.affectationRepository.remove(affectationToDelete);
  }
}