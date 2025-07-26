import { BadRequestException, Injectable, NotFoundException, Scope, Inject, UnauthorizedException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm"; // Assurez-vous que c'est le bon import pour TypeORM
import { In, Repository, Like } from "typeorm";
import { CoefficientClasse } from "./coeff.entity";
import { Classe } from "../classe/classe.entity";
import { Matiere } from "../matieres/matiere.entity";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";

@Injectable({ scope: Scope.REQUEST })
export class CoefficientClasseService {
  private readonly logger = new Logger(CoefficientClasseService.name);

  constructor(
    @InjectRepository(CoefficientClasse)
    private repo: Repository<CoefficientClasse>,

    @InjectRepository(Classe)
    private classeRepo: Repository<Classe>,

    @InjectRepository(Matiere)
    private matiereRepo: Repository<Matiere>,

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

  async findAll() {
    const blocId = this.getBlocId();
    if (blocId === null) return [];

    return this.repo.find({
      relations: ["classe", "matiere"],
      where: {
        classe: {
          blocId: blocId,
        },
      },
    });
  }
  async cloneCoefficients(fromClasseId: number, toClasseId: number) {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    // 1. Vérifier que les deux classes appartiennent bien au bloc de l'utilisateur
    const fromClasse = await this.classeRepo.findOneBy({ id: fromClasseId, blocId });
    const toClasse = await this.classeRepo.findOneBy({ id: toClasseId, blocId });

    if (!fromClasse) {
      throw new NotFoundException(`La classe source avec l'ID ${fromClasseId} n'a pas été trouvée dans votre établissement.`);
    }
    if (!toClasse) {
      throw new NotFoundException(`La classe de destination avec l'ID ${toClasseId} n'a pas été trouvée dans votre établissement.`);
    }

    // 2. Récupérer les coefficients de la classe source
    const coefficients = await this.repo.find({
      where: { classe: { id: fromClasseId } },
      relations: ["matiere"], // La relation 'classe' n'est plus nécessaire ici
    });

    if (coefficients.length === 0) {
      throw new BadRequestException("La classe source n'a pas de coefficients à copier.");
    }

    // 3. Préparer les nouveaux coefficients pour la classe cible
    const newCoefficients = coefficients.map(coef => ({
      classe_id: toClasseId,
      matiere_id: coef.matiere.id,
      coefficient: coef.coefficient,
    }));

    // 4. Utiliser la méthode createMany (sécurisée) pour insérer les nouveaux coefficients
    return this.createMany(newCoefficients);
  }

  async update(id: number, newCoefficient: number): Promise<CoefficientClasse> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }
    // Vérifier que le coefficient appartient bien au bloc de l'utilisateur
    const coefficientToUpdate = await this.repo.findOne({
      where: {
        id: id,
        classe: { blocId: blocId },
      },
    });

    if (!coefficientToUpdate) {
      throw new NotFoundException(`Coefficient avec l'ID ${id} non trouvé dans votre établissement.`);
    }

    coefficientToUpdate.coefficient = newCoefficient;
    return this.repo.save(coefficientToUpdate);
  }

  async updateGroupedCoefficients(
    classeId: number,
    matiereId: number,
    newCoefficient: number,
  ): Promise<{ updated: number; created: number }> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    // 1. Trouver la classe originale pour obtenir son niveau et son année scolaire
    const originalClasse = await this.classeRepo.findOne({
      // Sécurisation : on vérifie que la classe appartient au bloc de l'utilisateur
      where: { id: classeId, blocId: blocId },
      relations: ['anneeScolaire'],
    });

    if (!originalClasse) {
      throw new NotFoundException(`Classe avec l'ID ${classeId} non trouvée.`);
    }

    const { anneeScolaire, niveau } = originalClasse;
    const namePrefixMatch = originalClasse.nom.match(/^(\d+)/);

    let similarClasses: Classe[];

    if (namePrefixMatch) {
      const prefix = namePrefixMatch[1];
      // 2. Trouver les classes par préfixe numérique
      similarClasses = await this.classeRepo.find({
        where: {
          anneeScolaire: { id: anneeScolaire.id },
          blocId: blocId, // Sécurisation
          nom: Like(`${prefix}%`),
        },
      });
    } else {
      // 3. Sinon, trouver les classes par niveau
      similarClasses = await this.classeRepo.find({
        where: { anneeScolaire: { id: anneeScolaire.id }, niveau, blocId: blocId }, // Sécurisation
      });
    }

    const similarClasseIds = similarClasses.map(c => c.id);

    if (similarClasseIds.length === 0) {
      return { updated: 0, created: 0 };
    }

    // 4. Mettre à jour tous les coefficients existants pour ces classes et cette matière
    const updateResult = await this.repo.update(
      {
        classe: { id: In(similarClasseIds) },
        matiere: { id: matiereId },
      },
      { coefficient: newCoefficient },
    );

    // 5. Identifier les classes pour lesquelles un coefficient doit être créé
    const existingCoeffs = await this.repo.find({
      where: { classe: { id: In(similarClasseIds) }, matiere: { id: matiereId } },
      select: ['classe'],
      relations: ['classe'],
    });
    const classesWithCoeff = new Set(existingCoeffs.map(c => c.classe.id));
    const classesToCreateCoeffFor = similarClasses.filter(c => !classesWithCoeff.has(c.id));

    if (classesToCreateCoeffFor.length > 0) {
      const newCoefficientsData = classesToCreateCoeffFor.map(classe => ({ classe_id: classe.id, matiere_id: matiereId, coefficient: newCoefficient }));
      await this.createMany(newCoefficientsData);
    }

    return { updated: updateResult.affected || 0, created: classesToCreateCoeffFor.length };
  }

  async createGroupedCoefficients(
    sourceClasseId: number,
    newCoefficients: { matiere_id: number; coefficient: number }[],
  ): Promise<{ created: number }> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    // 1. Trouver la classe originale pour obtenir son niveau et son année scolaire
    const originalClasse = await this.classeRepo.findOne({
      // Sécurisation : on vérifie que la classe appartient au bloc de l'utilisateur
      where: { id: sourceClasseId, blocId: blocId },
      relations: ['anneeScolaire'],
    });

    if (!originalClasse) {
      throw new NotFoundException(`Classe source avec l'ID ${sourceClasseId} non trouvée.`);
    }

    const { anneeScolaire, niveau } = originalClasse;
    const namePrefixMatch = originalClasse.nom.match(/^(\d+)/);

    let similarClasses: Classe[];

    if (namePrefixMatch) {
      const prefix = namePrefixMatch[1];
      // 2. Trouver les classes par préfixe numérique
      similarClasses = await this.classeRepo.find({
        where: {
          anneeScolaire: { id: anneeScolaire.id },
          blocId: blocId, // Sécurisation
          nom: Like(`${prefix}%`),
        },
      });
    } else {
      // 3. Sinon, trouver les classes par niveau
      similarClasses = await this.classeRepo.find({
        where: {
          anneeScolaire: { id: anneeScolaire.id },
          niveau: niveau, blocId: blocId, // Sécurisation
        },
      });
    }
    const similarClasseIds = similarClasses.map(c => c.id);
    const newMatiereIds = newCoefficients.map(nc => nc.matiere_id);

    if (similarClasseIds.length === 0 || newMatiereIds.length === 0) {
      return { created: 0 };
    }

    // 4. Trouver les coefficients existants pour éviter de créer des doublons
    const existingCoeffs = await this.repo.find({
      where: {
        classe: { id: In(similarClasseIds) },
        matiere: { id: In(newMatiereIds) },
      },
      relations: ['classe', 'matiere'],
    });

    const existingCoeffsSet = new Set(
      existingCoeffs.map(ec => `${ec.classe.id}-${ec.matiere.id}`)
    );

    // 5. Construire la liste des coefficients à créer
    const coefficientsToCreate: { classe_id: number; matiere_id: number; coefficient: number }[] = [];

    for (const classe of similarClasses) {
      for (const newCoeff of newCoefficients) {
        const key = `${classe.id}-${newCoeff.matiere_id}`;
        if (!existingCoeffsSet.has(key)) {
          coefficientsToCreate.push({
            classe_id: classe.id,
            matiere_id: newCoeff.matiere_id,
            coefficient: newCoeff.coefficient,
          });
        }
      }
    }

    // 6. Créer les nouveaux coefficients en masse
    if (coefficientsToCreate.length > 0) {
      await this.createMany(coefficientsToCreate);
    }

    return { created: coefficientsToCreate.length };
  }

  async createMany(
    data: { classe_id: number; matiere_id: number; coefficient: number }[],
  ) {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    if (data.length === 0) {
      return [];
    }

    const classeIds = [...new Set(data.map((item) => item.classe_id))];
    const matiereIds = [...new Set(data.map((item) => item.matiere_id))];

    // 1. Récupérer toutes les entités nécessaires en deux requêtes
    const classes = await this.classeRepo.find({
      where: { id: In(classeIds), blocId: blocId },
    });
    const matieres = await this.matiereRepo.find({
      where: { id: In(matiereIds) },
    });

    // Créer des maps pour des recherches rapides
    const classesMap = new Map(classes.map((c) => [c.id, c]));
    const matieresMap = new Map(matieres.map((m) => [m.id, m]));

    const entitiesToSave: CoefficientClasse[] = [];

    // 2. Valider et créer les entités en mémoire
    for (const item of data) {
      const classe = classesMap.get(item.classe_id);
      const matiere = matieresMap.get(item.matiere_id);

      if (!classe || !matiere) {
        throw new BadRequestException(`Impossible de créer le coefficient pour la classe ID ${item.classe_id}. Vérifiez que la classe et la matière existent dans votre établissement.`);
      }

      const entity = this.repo.create({
        classe,
        matiere,
        coefficient: item.coefficient,
      });
      entitiesToSave.push(entity);
    }

    // 3. Sauvegarder toutes les entités en une seule transaction
    return this.repo.save(entitiesToSave);
  }
}
