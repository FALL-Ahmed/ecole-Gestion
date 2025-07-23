import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm"; // Assurez-vous que c'est le bon import pour TypeORM
import { In, Repository, Like } from "typeorm";
import { CoefficientClasse } from "./coeff.entity";
import { Classe } from "../classe/classe.entity";
import { Matiere } from "../matieres/matiere.entity";

@Injectable()
export class CoefficientClasseService {
  prisma: any;
  constructor(
    @InjectRepository(CoefficientClasse)
    private repo: Repository<CoefficientClasse>,

    @InjectRepository(Classe)
    private classeRepo: Repository<Classe>,

    @InjectRepository(Matiere)
    private matiereRepo: Repository<Matiere>
  ) {}

  async findAll() {
  const data = await this.repo.find({ relations: ["classe", "matiere"] });
  console.log("CoefficientClasse - findAll:", data);
  return data;
}
async cloneCoefficients(fromClasseId: number, toClasseId: number) {
  // 1. Récupérer les coefficients de la classe source
  const coefficients = await this.repo.find({
    where: { classe: { id: fromClasseId } },
    relations: ["classe", "matiere"]
  });

  if (coefficients.length === 0) {
    throw new BadRequestException("Classe source sans coefficients à copier.");
  }

  // 2. Préparer les nouveaux coefficients pour la classe cible
  const newCoefficients = coefficients.map(coef => ({
    classe_id: toClasseId,
    matiere_id: coef.matiere.id,
    coefficient: coef.coefficient,
  }));

  // 3. Utiliser la méthode createMany que tu as déjà, pour insérer les nouveaux coefficients
  return this.createMany(newCoefficients);
}

 async update(id: number, newCoefficient: number): Promise<CoefficientClasse> {
    const coefficientToUpdate = await this.repo.findOneBy({ id });
    if (!coefficientToUpdate) {
      throw new NotFoundException(`Coefficient avec l'ID ${id} non trouvé.`);
    }

    coefficientToUpdate.coefficient = newCoefficient;
    return this.repo.save(coefficientToUpdate);
  }

  async updateGroupedCoefficients(
    classeId: number,
    matiereId: number,
    newCoefficient: number,
  ): Promise<{ updated: number; created: number }> {
    // 1. Trouver la classe originale pour obtenir son niveau et son année scolaire
    const originalClasse = await this.classeRepo.findOne({
      where: { id: classeId },
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
          nom: Like(`${prefix}%`),
        },
      });
    } else {
      // 3. Sinon, trouver les classes par niveau
      similarClasses = await this.classeRepo.find({
        where: { anneeScolaire: { id: anneeScolaire.id }, niveau },
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
    // 1. Trouver la classe originale pour obtenir son niveau et son année scolaire
    const originalClasse = await this.classeRepo.findOne({
      where: { id: sourceClasseId },
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
          nom: Like(`${prefix}%`),
        },
      });
    } else {
      // 3. Sinon, trouver les classes par niveau
      similarClasses = await this.classeRepo.find({
        where: {
          anneeScolaire: { id: anneeScolaire.id },
          niveau: niveau,
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
    data: { classe_id: number; matiere_id: number; coefficient: number }[]
  ) {
    const saved: CoefficientClasse[] = [];

    for (const item of data) {
      const classe = await this.classeRepo.findOneBy({ id: item.classe_id });
      const matiere = await this.matiereRepo.findOneBy({ id: item.matiere_id });

      if (!classe || !matiere) {
        throw new Error(
          `Classe ou Matière introuvable (classe_id: ${item.classe_id}, matiere_id: ${item.matiere_id})`
        );
      }

      const entity = this.repo.create({
        classe,
        matiere,
        coefficient: item.coefficient,
      });

      saved.push(await this.repo.save(entity));
    }

    return saved;
  }
}
