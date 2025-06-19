import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Chapitre, StatutChapitre } from './chapitre.entity';
import { CreateChapitreDto } from './dto/create-chapitre.dto';
import { UpdateChapitreDto } from './dto/update-chapitre.dto';

@Injectable()
export class ChapitreService {
  constructor(
    @InjectRepository(Chapitre)
    private chapitreRepository: Repository<Chapitre>,
  ) {}

  async create(createChapitreDto: CreateChapitreDto): Promise<Chapitre> {
    const nouveauChapitre = this.chapitreRepository.create({
        ...createChapitreDto,
        statut: createChapitreDto.statut || StatutChapitre.PLANIFIE,
    });
    return this.chapitreRepository.save(nouveauChapitre);
  }

  async findAll(queryParams?: { classe_id?: string; matiere_id?: string }): Promise<Chapitre[]> {
    const options: FindManyOptions<Chapitre> = {
        // relations: ['matiere', 'classe'], // Décommentez si relations définies
    };
    
    const whereConditions: FindOptionsWhere<Chapitre> = {};

    if (queryParams?.classe_id) {
        whereConditions.classeId = parseInt(queryParams.classe_id, 10);
    }
    if (queryParams?.matiere_id) {
        whereConditions.matiereId = parseInt(queryParams.matiere_id, 10);
    }
    // Note: professeur_id and annee_scolaire_id filtering removed as they are not in Chapitre table

    if (Object.keys(whereConditions).length > 0) {
        options.where = whereConditions;
    }

    return this.chapitreRepository.find(options);
  }

  async findOne(id: number): Promise<Chapitre> {
    const chapitre = await this.chapitreRepository.findOne({ 
        where: { id },
        // relations: ['matiere', 'classe'],
    });
    if (!chapitre) {
      throw new NotFoundException(`Chapitre avec l'ID ${id} non trouvé`);
    }
    return chapitre;
  }

  async update(id: number, updateChapitreDto: UpdateChapitreDto): Promise<Chapitre> {
    // Les champs non présents dans UpdateChapitreDto (comme professeurId, anneeScolaireId)
    // ne seront pas affectés par cette opération d'update.
    await this.chapitreRepository.update(id, updateChapitreDto);
    const updatedChapitre = await this.findOne(id);
    if (!updatedChapitre) {
        throw new NotFoundException(`Chapitre avec l'ID ${id} non trouvé après la mise à jour.`);
    }
    return updatedChapitre;
  }

  async remove(id: number): Promise<void> {
    const result = await this.chapitreRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Chapitre avec l'ID ${id} non trouvé`);
    }
  }
}
