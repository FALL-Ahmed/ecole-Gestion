import {
  Injectable,
  NotFoundException,
  ConflictException,
  Scope,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Bloc } from './bloc.entity';
import { CreateBlocDto } from './dto/create-bloc.dto';
import { UpdateBlocDto } from './dto/update-bloc.dto';
import { UtilisateurBloc } from '../users/utilisateur-bloc.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class BlocService {
  private readonly logger = new Logger(BlocService.name);

  constructor(
    @InjectRepository(Bloc)
    private readonly blocRepository: Repository<Bloc>,

    @InjectRepository(UtilisateurBloc)
    private readonly utilisateurBlocRepository: Repository<UtilisateurBloc>,

    @Inject('central')
    private readonly centralDataSource: DataSource,

    @Inject(REQUEST)
    private readonly request: Request,
  ) {}

  private getBlocId(): number | null {
    const user = this.request.user as any;
    if (user && user.blocId) {
      this.logger.debug(`[getBlocId] blocId ${user.blocId} trouvé dans le token JWT.`);
      return user.blocId;
    }
    this.logger.warn(`[getBlocId] Aucun blocId trouvé pour l'utilisateur ${user?.email}.`);
    return null;
  }

  async create(createBlocDto: CreateBlocDto): Promise<Bloc> {
    const adminBlocId = this.getBlocId();
    if (!adminBlocId) {
      throw new UnauthorizedException("Action non autorisée. Contexte d'administrateur (blocId) manquant.");
    }

    const mappingResult = await this.centralDataSource.query(
      `SELECT ecole_id FROM bloc_ecole_mapping WHERE bloc_id = ?`,
      [adminBlocId],
    );

    if (!mappingResult || mappingResult.length === 0) {
      throw new NotFoundException(`Impossible de trouver l'école associée à votre bloc (ID: ${adminBlocId}).`);
    }
    const ecoleId = mappingResult[0].ecole_id;

    const bloc = this.blocRepository.create(createBlocDto);
    const newBloc = await this.blocRepository.save(bloc);
    this.logger.log(`Nouveau bloc '${newBloc.nom}' (ID: ${newBloc.id}) créé dans la base de données du tenant.`);

    try {
      await this.centralDataSource.query(
        `INSERT INTO bloc_ecole_mapping (bloc_id, ecole_id) VALUES (?, ?)`,
        [newBloc.id, ecoleId],
      );
      this.logger.log(`Mapping créé dans la base centrale pour le bloc ID: ${newBloc.id} et l'école ID: ${ecoleId}.`);
    } catch (error) {
      this.logger.error(`ERREUR CRITIQUE: Le bloc ID ${newBloc.id} a été créé, mais son mapping a échoué. Annulation.`, error.stack);
      await this.blocRepository.delete(newBloc.id);
      throw new ConflictException("Le bloc a été créé mais son association à l'école a échoué. L'opération a été annulée.");
    }

    return newBloc;
  }

  async findAll(): Promise<any[]> {
    const blocs = await this.blocRepository
      .createQueryBuilder('bloc')
      .leftJoin('bloc.accesUtilisateurs', 'acces')
      .select([
        'bloc.id',
        'bloc.nom',
        'bloc.adresse',
        'bloc.telephone',
      ])
      .addSelect('COUNT(acces.id)', 'userCount')
      .groupBy('bloc.id')
      .getRawMany();

    return blocs.map(b => ({
      id: b.bloc_id,
      nom: b.bloc_nom,
      adresse: b.bloc_adresse,
      telephone: b.bloc_telephone,
      userCount: parseInt(b.userCount, 10) || 0
    }));
  }

  async findOne(id: number): Promise<Bloc> {
    const bloc = await this.blocRepository.findOneBy({ id });
    if (!bloc) {
      throw new NotFoundException(`Bloc with ID "${id}" not found`);
    }
    return bloc;
  }

  async update(id: number, updateBlocDto: UpdateBlocDto): Promise<Bloc> {
    await this.findOne(id); // check if exists
    await this.blocRepository.update(id, updateBlocDto);
    return this.findOne(id); // return updated entity
  }

  async remove(id: number): Promise<void> {
    const associations = await this.utilisateurBlocRepository.count({
      where: { bloc: { id } },
    });

    if (associations > 0) {
      throw new ConflictException(`Impossible de supprimer ce bloc car ${associations} utilisateur(s) y sont encore affecté(s).`);
    }

    try {
      await this.centralDataSource.query(
        `DELETE FROM bloc_ecole_mapping WHERE bloc_id = ?`,
        [id],
      );
      this.logger.log(`Mapping pour le bloc ID ${id} supprimé de la base centrale.`);
    } catch (error) {
      this.logger.error(`ERREUR: Impossible de supprimer le mapping pour le bloc ID ${id}. La suppression du bloc est annulée.`, error.stack);
      throw new ConflictException("Impossible de supprimer l'association du bloc à l'école. La suppression est annulée.");
    }

    const result = await this.blocRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Bloc with ID "${id}" not found`);
    }
  }
}
