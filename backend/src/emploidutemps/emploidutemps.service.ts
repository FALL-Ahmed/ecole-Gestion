// src/emploi-du-temps/emploi-du-temps.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmploiDuTemps } from './emploidutemps.entity';
import { CreateEmploiDuTempsDto } from './dto/create-emploi-du-temps.dto';
import { UpdateEmploiDuTempsDto } from './dto/update-emploi-du-temps.dto';

// Define a type for filters
interface EmploiDuTempsFilters {
  classeId?: number;
  professeurId?: number;
  anneeAcademiqueId?: number;
}

@Injectable()
export class EmploiDuTempsService {
  constructor(
    @InjectRepository(EmploiDuTemps)
    private emploiDuTempsRepository: Repository<EmploiDuTemps>,
  ) {}

  async create(createEmploiDuTempsDto: CreateEmploiDuTempsDto): Promise<EmploiDuTemps> {
    const newEntry = this.emploiDuTempsRepository.create(createEmploiDuTempsDto);
    return this.emploiDuTempsRepository.save(newEntry);
  }

  // --- MODIFIED: findAll to accept filters ---
  async findAll(filters?: EmploiDuTempsFilters): Promise<EmploiDuTemps[]> {
    const whereClause: any = {};
    const relationsToLoad: string[] = ['classe', 'matiere', 'professeur'];

    if (filters?.classeId) {
      whereClause.classe_id = filters.classeId;
      // Add relation to classe if not already there, to filter by annee_academique_id
      if (filters.anneeAcademiqueId) {
        // IMPORTANT: Assuming 'Classe' entity has 'annee_scolaire_id' directly or a relation to 'AnneeAcademique'
        // If 'Classe' has 'annee_scolaire_id' column:
        whereClause.classe = {
          id: filters.classeId, // Also include class ID if filtering by relation
          annee_scolaire_id: filters.anneeAcademiqueId,
        };
        // Ensure the 'classe' relation is loaded for filtering
        if (!relationsToLoad.includes('classe')) {
            relationsToLoad.push('classe');
        }
      }
    }
    if (filters?.professeurId) {
      whereClause.professeur_id = filters.professeurId;
    }
    // If filtering by annee_academique_id alone (without classeId), it's more complex
    // as EmploiDuTemps does not directly store annee_academique_id.
    // The current frontend uses annee_academique_id primarily with classe_id.
    // If you need to filter by annee_academique_id without a class,
    // you'd need a more advanced TypeORM query builder or a direct relation on EmploiDuTemps.

    return this.emploiDuTempsRepository.find({
      where: whereClause,
      relations: relationsToLoad, // Dynamically add relations if needed for filtering
    });
  }
  // --- END MODIFIED ---

  async findOne(id: number): Promise<EmploiDuTemps> {
    const entry = await this.emploiDuTempsRepository.findOne({
      where: { id },
      relations: ['classe', 'matiere', 'professeur'],
    });
    if (!entry) {
      throw new NotFoundException(`EmploiDuTemps with ID ${id} not found.`);
    }
    return entry;
  }

  async update(id: number, updateEmploiDuTempsDto: UpdateEmploiDuTempsDto): Promise<EmploiDuTemps> {
    const entry = await this.emploiDuTempsRepository.findOneBy({ id }); // Use findOneBy for simpler primary key lookup
    if (!entry) {
      throw new NotFoundException(`EmploiDuTemps with ID ${id} not found.`);
    }
    Object.assign(entry, updateEmploiDuTempsDto);
    return this.emploiDuTempsRepository.save(entry);
  }

  async remove(id: number): Promise<void> {
    const result = await this.emploiDuTempsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`EmploiDuTemps with ID ${id} not found.`);
    }
  }

  // --- REMOVED: Custom methods as they are now handled by the modified findAll ---
  // async findByClassAndYear(classeId: number, anneeScolaireId: number): Promise<EmploiDuTemps[]> {
  //   return this.emploiDuTempsRepository.find({
  //     where: { classe_id: classeId }, // Needs to include annee_scolaire_id through relation
  //     relations: ['classe', 'matiere', 'professeur'],
  //   });
  // }

  // async findByTeacher(professeurId: number): Promise<EmploiDuTemps[]> {
  //   return this.emploiDuTempsRepository.find({
  //     where: { professeur_id: professeurId },
  //     relations: ['classe', 'matiere', 'professeur'],
  //   });
  // }
}