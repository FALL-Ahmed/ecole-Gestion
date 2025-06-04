import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CoefficientClasse } from "./coeff.entity";

@Injectable()
export class CoefficientClasseService {
  constructor(
    @InjectRepository(CoefficientClasse)
    private repo: Repository<CoefficientClasse>
  ) {}

  findAll() {
    return this.repo.find({ relations: ["classe", "matiere"] });
  }

  create(data: { classe_id: number; matiere_id: number; coefficient: number }) {
    return this.repo.save({
      classe: { id: data.classe_id },
      matiere: { id: data.matiere_id },
      coefficient: data.coefficient,
    });
  }

  // Ajoute update/delete si besoin
}