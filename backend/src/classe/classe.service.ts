import {
  Injectable,
  NotFoundException,
  Scope,
  Inject,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Classe } from './classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { CreateClasseDto } from './dto/create-classe.dto';
import { UpdateClasseDto } from './dto/update-classe.dto';


@Injectable({ scope: Scope.REQUEST })
export class ClasseService {
    private readonly logger = new Logger(ClasseService.name);

  constructor(
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(anneescolaire)
    private readonly anneeScolaireRepository: Repository<anneescolaire>,
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

  async findAll(): Promise<Classe[]> {
      const blocId = this.getBlocId();
    this.logger.debug(`[findAll] Recherche des classes pour le blocId: ${blocId}`);



if (blocId === null) {
      this.logger.warn(
        "[findAll] Aucun blocId fourni, retour d'une liste vide pour des raisons de sécurité.",
      );
      return [];
    }

    try {
      const classes = await this.classeRepository
        .createQueryBuilder('classe')
        .leftJoinAndSelect('classe.anneeScolaire', 'anneeScolaire')
        .where('classe.blocId = :blocId', { blocId })
        .orderBy('classe.nom', 'ASC')
        .getMany();

      this.logger.log(`[findAll] ${classes.length} classes trouvées pour le blocId: ${blocId}.`);
      return classes;
    } catch (error) {
      this.logger.error(`[findAll] Erreur lors de la recherche des classes pour le blocId: ${blocId}`, error.stack);
      throw error;
    }
  }


  async findById(id: number): Promise<Classe> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new NotFoundException(`Classe avec l'ID ${id} non trouvée car aucun bloc n'est sélectionné.`);
    }
    const classe = await this.classeRepository.findOne({
      where: { id, blocId },
      relations: ['anneeScolaire', 'inscriptions'],
    });

    if (!classe) {
      throw new NotFoundException(
        `Classe avec l'ID ${id} non trouvée dans ce bloc.`,
      );
    }
    return classe;
  }

   async createClasse(data: CreateClasseDto): Promise<Classe> {

    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException(
        "Impossible de créer une classe sans être dans le contexte d'un bloc.",
      );
    }
    // Vérifier si l'année scolaire existe
    const anneeScolaire = await this.anneeScolaireRepository.findOneBy({ id: data.anneeScolaireId });
    if (!anneeScolaire) {
      throw new NotFoundException(`Année scolaire avec l'ID ${data.anneeScolaireId} non trouvée`);
    }

    const newClasse = this.classeRepository.create({
      ...data,
      anneeScolaire,
      blocId, // On assigne le bloc de l'utilisateur qui crée la classe
    });

    return this.classeRepository.save(newClasse);
  }

  async updateClasse(id: number, data: UpdateClasseDto): Promise<Classe> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    // Met à jour la classe SEULEMENT si l'ID et le blocId correspondent.
    const result = await this.classeRepository.update({ id, blocId }, data);

    if (result.affected === 0) {
      throw new NotFoundException(`Classe avec l'ID ${id} non trouvée dans ce bloc.`);
    }
    
    // findOneBy est plus léger car il ne charge pas les relations par défaut.
const updatedClasse = await this.classeRepository.findOneBy({ id });
    if (!updatedClasse) {
      // Ce cas est peu probable si la mise à jour a réussi, mais c'est une bonne pratique pour la sécurité des types.
      this.logger.error(
        `[updateClasse] La classe avec l'ID ${id} n'a pas été trouvée après une mise à jour réussie.`,
      );
      throw new NotFoundException(`Classe avec l'ID ${id} non trouvée après la mise à jour.`);
    }
    return updatedClasse;  }



  async deleteClasse(id: number): Promise<void> {
    // On s'assure que la classe appartient bien au bloc de l'utilisateur avant de la supprimer
       const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }
    // Supprime la classe SEULEMENT si l'ID et le blocId correspondent.
    const result = await this.classeRepository.delete({ id, blocId });
    if (result.affected === 0) {
      throw new NotFoundException(`Classe avec l'ID ${id} non trouvée dans ce bloc pour suppression.`);
    }
  }

  async findByAnneeScolaire(anneeScolaireId: number): Promise<Classe[]> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      return []; // Retourne une liste vide si aucun bloc n'est sélectionné
    }
    return this.classeRepository.find({
      where: { anneeScolaire: { id: anneeScolaireId }, blocId },
      relations: ['anneeScolaire'],
    });
  }
}