import { Injectable, NotFoundException, Scope, Inject, UnauthorizedException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExceptionEmploiDuTemps } from './exceptionemploidutemps.entity';
import { CreateExceptionEmploiDuTempsDto } from './dto/create-exception-emploi-du-temps.dto';
import { UpdateExceptionEmploiDuTempsDto } from './dto/update-exception-emploi-du-temps.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Inscription } from '../inscription/inscription.entity';

// Define a type for filters for the findAll method
interface ExceptionFilters {
  startDate?: string;
  endDate?: string;
  classeId?: number;
  professeurId?: number;
}

@Injectable({ scope: Scope.REQUEST })
export class ExceptionEmploiDuTempsService {
  private readonly logger = new Logger(ExceptionEmploiDuTempsService.name);

  constructor(
    @InjectRepository(ExceptionEmploiDuTemps)
    private exceptionEmploiDuTempsRepository: Repository<ExceptionEmploiDuTemps>,
    @InjectRepository(Inscription)
    private inscriptionRepository: Repository<Inscription>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private getBlocId(): number | null {
    const user = this.request.user as any;

    // Priorité 1: Le blocId dans le token (pour admin, prof, élève)
    if (user && user.blocId) {
      this.logger.debug(`[getBlocId] blocId ${user.blocId} trouvé dans le token JWT.`);
      return user.blocId;
    }

    // Priorité 2: Le blocId dans les paramètres de la requête (pour les parents)
    const queryBlocId = this.request.query.blocId;
    if (queryBlocId && !isNaN(parseInt(queryBlocId as string, 10))) {
      const blocId = parseInt(queryBlocId as string, 10);
      this.logger.debug(`[getBlocId] blocId ${blocId} trouvé dans les paramètres de la requête.`);
      return blocId;
    }

    this.logger.warn(`[getBlocId] Aucun blocId trouvé pour l'utilisateur ${user?.email}.`);
    return null;
  }

  private async verifyParentAccessToClasse(classeId: number): Promise<void> {
    const user = this.request.user as any;
    if (user.role !== 'parent') {
      return;
    }

    const parentId = user.id;
    const inscription = await this.inscriptionRepository.findOne({
      where: {
        classe: { id: classeId },
        utilisateur: { parentId: parentId },
        actif: true,
      },
    });

    if (!inscription) {
      throw new ForbiddenException("Accès non autorisé aux exceptions de cette classe.");
    }
  }

  async create(createDto: CreateExceptionEmploiDuTempsDto): Promise<ExceptionEmploiDuTemps> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Impossible de créer une exception sans être dans le contexte d'un bloc.");
    }
    const newEntry = this.exceptionEmploiDuTempsRepository.create({
      ...createDto,
      blocId: blocId, // Enforce blocId from context
    });
    return this.exceptionEmploiDuTempsRepository.save(newEntry);
  }

  // --- MODIFIED: findAll to accept filters and integrate period/class/teacher logic ---
  async findAll(filters?: ExceptionFilters): Promise<ExceptionEmploiDuTemps[]> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      this.logger.warn("[findAll] Aucun blocId fourni, retour d'une liste vide.");
      return [];
    }

    if (filters?.classeId) {
      await this.verifyParentAccessToClasse(filters.classeId);
    }

    const queryBuilder = this.exceptionEmploiDuTempsRepository.createQueryBuilder('exception')
      .leftJoinAndSelect('exception.classe', 'classe')
      .leftJoinAndSelect('exception.professeur', 'professeur')
      .leftJoinAndSelect('exception.nouvelle_matiere', 'nouvelle_matiere')
      .leftJoinAndSelect('exception.nouveau_professeur', 'nouveau_professeur')
      .leftJoinAndSelect('exception.nouvelle_classe', 'nouvelle_classe')
      .where('exception.blocId = :blocId', { blocId });

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
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new NotFoundException(`Exception avec l'ID ${id} non trouvée car aucun bloc n'est sélectionné.`);
    }
    const entry = await this.exceptionEmploiDuTempsRepository.findOne({
      where: { id, blocId },
      relations: ['classe', 'professeur', 'nouvelle_matiere', 'nouveau_professeur', 'nouvelle_classe'],
    });
    if (!entry) {
      throw new NotFoundException(`Exception avec l'ID ${id} non trouvée dans ce bloc.`);
    }

    if (entry.classe_id) {
      await this.verifyParentAccessToClasse(entry.classe_id);
    }
    return entry;
  }

  async update(id: number, updateDto: UpdateExceptionEmploiDuTempsDto): Promise<ExceptionEmploiDuTemps> {
    const entry = await this.findOne(id); // findOne performs the security check

    const { blocId, ...restOfDto } = updateDto as any;
    if (blocId) {
      this.logger.warn(`Tentative de modification du blocId via l'update pour l'exception ${id}, ce qui est ignoré.`);
    }

    Object.assign(entry, restOfDto);
    return this.exceptionEmploiDuTempsRepository.save(entry);
  }

  async remove(id: number): Promise<void> {
    // findOne effectuera toutes les vérifications de sécurité (blocId, accès parent)
    const exceptionToRemove = await this.findOne(id);

    await this.exceptionEmploiDuTempsRepository.remove(exceptionToRemove);
  }

  // --- REMOVED: findExceptionsByPeriod as its logic is now in findAll ---
}