import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Matiere } from './matiere.entity';

@Injectable()
export class MatiereService {
  constructor(
    @InjectRepository(Matiere)
    private readonly matiereRepository: Repository<Matiere>,
  ) {}

  findAll(): Promise<Matiere[]> {
    return this.matiereRepository.find();
  }

  async findOne(id: number): Promise<Matiere> {
    if (isNaN(id)) {
      throw new BadRequestException(`L'ID de la matière '${id}' n'est pas valide.`);
    }
    const matiere = await this.matiereRepository.findOneBy({ id });
    if (!matiere) {
      throw new NotFoundException(`Matière avec l'ID ${id} non trouvée.`);
    }
    return matiere;
  }

  async create(data: Partial<Matiere>): Promise<Matiere> {
    if (!data.nom || !data.code) {
      throw new BadRequestException("Le nom et le code de la matière sont requis.");
    }
    const existing = await this.matiereRepository.findOneBy({ code: data.code });
    if (existing) {
      throw new ConflictException(`Une matière avec le code '${data.code}' existe déjà.`);
    }
    const matiere = this.matiereRepository.create(data);
    return this.matiereRepository.save(matiere);
  }

  async update(id: number, data: Partial<Matiere>): Promise<Matiere> {
    const matiere = await this.findOne(id); // findOne gère les erreurs Not Found et Bad Request

    // Vérifie les conflits de code si le code est modifié
    if (data.code && data.code !== matiere.code) {
      const existing = await this.matiereRepository.findOne({ where: { code: data.code } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Une matière avec le code '${data.code}' existe déjà.`);
      }
    }

    Object.assign(matiere, data);
    return this.matiereRepository.save(matiere);
  }

  async remove(id: number): Promise<void> {
    if (isNaN(id)) {
      throw new BadRequestException(`L'ID de la matière '${id}' n'est pas valide.`);
    }
    const result = await this.matiereRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Matière avec l'ID ${id} non trouvée pour suppression.`);
    }
  }
}