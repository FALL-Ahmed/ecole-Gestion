import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm"; // Assurez-vous que c'est le bon import pour TypeORM
import { Repository } from "typeorm";
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
