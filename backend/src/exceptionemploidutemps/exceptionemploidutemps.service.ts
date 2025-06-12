// src/exception-emploi-du-temps/exception-emploi-du-temps.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExceptionEmploiDuTemps } from './exceptionemploidutemps.entity';
import { CreateExceptionEmploiDuTempsDto } from './dto/create-exception-emploi-du-temps.dto';
import { UpdateExceptionEmploiDuTempsDto } from './dto/update-exception-emploi-du-temps.dto';

// Define a type for filters for the findAll method
interface ExceptionFilters {
  startDate?: string;
  endDate?: string;
  classeId?: number;
  professeurId?: number;
}

@Injectable()
export class ExceptionEmploiDuTempsService {
  constructor(
    @InjectRepository(ExceptionEmploiDuTemps)
    private exceptionEmploiDuTempsRepository: Repository<ExceptionEmploiDuTemps>,
  ) {}

  async create(createExceptionEmploiDuTempsDto: CreateExceptionEmploiDuTempsDto): Promise<ExceptionEmploiDuTemps> {
    const newEntry = this.exceptionEmploiDuTempsRepository.create(createExceptionEmploiDuTempsDto);
    return this.exceptionEmploiDuTempsRepository.save(newEntry);
  }

  // --- MODIFIED: findAll to accept filters and integrate period/class/teacher logic ---
  async findAll(filters?: ExceptionFilters): Promise<ExceptionEmploiDuTemps[]> {
    const queryBuilder = this.exceptionEmploiDuTempsRepository.createQueryBuilder('exception')
      .leftJoinAndSelect('exception.classe', 'classe')
      .leftJoinAndSelect('exception.professeur', 'professeur')
      .leftJoinAndSelect('exception.nouvelle_matiere', 'nouvelle_matiere')
      .leftJoinAndSelect('exception.nouveau_professeur', 'nouveau_professeur')
      .leftJoinAndSelect('exception.nouvelle_classe', 'nouvelle_classe');

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('exception.date_exception BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters?.classeId) {
      // Exceptions can affect a specific class or be global (classe_id IS NULL)
      queryBuilder.andWhere('(exception.classe_id = :classeId OR exception.classe_id IS NULL)', {
        classeId: filters.classeId,
      });
    }
    if (filters?.professeurId) {
      // Exceptions can affect a specific teacher or be global (professeur_id IS NULL)
      queryBuilder.andWhere('(exception.professeur_id = :professeurId OR exception.professeur_id IS NULL)', {
        professeurId: filters.professeurId,
      });
    }

    return queryBuilder.getMany();
  }
  // --- END MODIFIED ---

  async findOne(id: number): Promise<ExceptionEmploiDuTemps> {
    const entry = await this.exceptionEmploiDuTempsRepository.findOne({
      where: { id },
      relations: ['classe', 'professeur', 'nouvelle_matiere', 'nouveau_professeur', 'nouvelle_classe'],
    });
    if (!entry) {
      throw new NotFoundException(`ExceptionEmploiDuTemps with ID ${id} not found.`);
    }
    return entry;
  }

  async update(id: number, updateExceptionEmploiDuTempsDto: UpdateExceptionEmploiDuTempsDto): Promise<ExceptionEmploiDuTemps> {
    const entry = await this.exceptionEmploiDuTempsRepository.findOneBy({ id }); // Use findOneBy for simplicity
    if (!entry) {
      throw new NotFoundException(`ExceptionEmploiDuTemps with ID ${id} not found.`);
    }
    Object.assign(entry, updateExceptionEmploiDuTempsDto);
    return this.exceptionEmploiDuTempsRepository.save(entry);
  }

  async remove(id: number): Promise<void> {
    const result = await this.exceptionEmploiDuTempsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`ExceptionEmploiDuTemps with ID ${id} not found.`);
    }
  }

  // --- REMOVED: findExceptionsByPeriod as its logic is now in findAll ---
}