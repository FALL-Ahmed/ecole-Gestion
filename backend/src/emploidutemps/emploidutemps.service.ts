import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Scope,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EmploiDuTemps } from './emploidutemps.entity';
import { CreateEmploiDuTempsDto } from './dto/create-emploi-du-temps.dto';
import { UpdateEmploiDuTempsDto } from './dto/update-emploi-du-temps.dto';
import { Classe } from '../classe/classe.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Inscription } from '../inscription/inscription.entity';

// Define a type for filters
interface EmploiDuTempsFilters {
  classeId?: number;
  professeurId?: number;
  anneeAcademiqueId?: number;
}

@Injectable({ scope: Scope.REQUEST })
export class EmploiDuTempsService {
  private readonly logger = new Logger(EmploiDuTempsService.name);

  constructor(
    @InjectRepository(EmploiDuTemps)
    private emploiDuTempsRepository: Repository<EmploiDuTemps>,
    @InjectRepository(Classe)
    private classeRepository: Repository<Classe>,
    @InjectRepository(Inscription)
    private inscriptionRepository: Repository<Inscription>,
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
      throw new ForbiddenException("Accès non autorisé à l'emploi du temps de cette classe.");
    }
  }

  async create(createEmploiDuTempsDto: CreateEmploiDuTempsDto): Promise<EmploiDuTemps> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Impossible de créer une entrée sans être dans le contexte d'un bloc.");
    }

    // Security check: ensure the class belongs to the admin's bloc
    const classe = await this.classeRepository.findOneBy({ id: createEmploiDuTempsDto.classe_id, blocId });
    if (!classe) {
      throw new ForbiddenException(`La classe avec l'ID ${createEmploiDuTempsDto.classe_id} n'existe pas dans votre établissement.`);
    }

    const newEntry = this.emploiDuTempsRepository.create({
      ...createEmploiDuTempsDto,
      blocId,
    });
    return this.emploiDuTempsRepository.save(newEntry);
  }

  async findAll(filters?: EmploiDuTempsFilters): Promise<EmploiDuTemps[]> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      this.logger.warn("[findAll] Aucun blocId fourni, retour d'une liste vide.");
      return [];
    }

    if (filters?.classeId) {
      await this.verifyParentAccessToClasse(filters.classeId);
    }

    const where: FindOptionsWhere<EmploiDuTemps> = { blocId };

    if (filters?.classeId) {
      where.classe = { id: filters.classeId };
    }
    if (filters?.professeurId) {
      where.professeur = { id: filters.professeurId };
    }
    if (filters?.anneeAcademiqueId) {
      where.anneeAcademique = { id: filters.anneeAcademiqueId };
    }

    return this.emploiDuTempsRepository.find({
      where,
      relations: ['classe', 'matiere', 'professeur', 'anneeAcademique'],
    });
  }

  async findOne(id: number): Promise<EmploiDuTemps> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new NotFoundException(`EmploiDuTemps avec l'ID ${id} non trouvé car aucun bloc n'est sélectionné.`);
    }

    const entry = await this.emploiDuTempsRepository.findOne({
      where: { id, blocId },
      relations: ['classe', 'matiere', 'professeur', 'anneeAcademique'],
    });
    if (!entry) {
      throw new NotFoundException(`EmploiDuTemps with ID ${id} not found in this bloc.`);
    }

    await this.verifyParentAccessToClasse(entry.classe_id);

    return entry;
  }

  async update(id: number, updateEmploiDuTempsDto: UpdateEmploiDuTempsDto): Promise<EmploiDuTemps> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    // findOne will perform the security check
    const entry = await this.findOne(id);

    // If the class is being changed, verify the new class is in the same bloc
    if (updateEmploiDuTempsDto.classe_id && updateEmploiDuTempsDto.classe_id !== entry.classe_id) {
      const newClasse = await this.classeRepository.findOneBy({ id: updateEmploiDuTempsDto.classe_id, blocId });
      if (!newClasse) {
        throw new ForbiddenException(`La nouvelle classe avec l'ID ${updateEmploiDuTempsDto.classe_id} n'existe pas dans votre établissement.`);
      }
    }

    Object.assign(entry, updateEmploiDuTempsDto);
    return this.emploiDuTempsRepository.save(entry);
  }

  async remove(id: number): Promise<void> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }
    // findOne will perform all security checks (blocId, parent access)
    const entryToRemove = await this.findOne(id);

    await this.emploiDuTempsRepository.remove(entryToRemove);
  }
}