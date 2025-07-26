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
import { Inscription } from './inscription.entity';
import { CreateInscriptionDto } from './dto/create-inscription.dto';
import { User, UserRole } from '../users/user.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { UtilisateurBloc } from '../users/utilisateur-bloc.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
@Injectable({ scope: Scope.REQUEST })
export class InscriptionService {
  private readonly logger = new Logger(InscriptionService.name);
  constructor(
    @InjectRepository(Inscription)
    private readonly inscriptionRepository: Repository<Inscription>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,

    @InjectRepository(anneescolaire)
    private readonly anneeScolaireRepository: Repository<anneescolaire>,

    @InjectRepository(UtilisateurBloc)
    private readonly utilisateurBlocRepository: Repository<UtilisateurBloc>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private getBlocId(): number | null {
    const user = this.request.user as any;

    if (user && user.blocId) {
      return user.blocId;
    }

    const queryBlocId = this.request.query.blocId;
    if (queryBlocId && !isNaN(parseInt(queryBlocId as string, 10))) {
      return parseInt(queryBlocId as string, 10);
    }

    this.logger.warn(`[getBlocId] Aucun blocId trouvé pour l'utilisateur ${user?.email}.`);
    return null;
  }

  private async verifyParentAccess(eleveId: number): Promise<void> {
    const user = this.request.user as any;
    if (user.role !== 'parent') {
      return;
    }

    const parentId = user.id;
    const student = await this.userRepository.findOne({
      where: { id: eleveId },
    });

    if (!student || student.parentId !== parentId) {
      throw new ForbiddenException("Accès non autorisé aux données de cet élève.");
    }
  }

  async create(data: CreateInscriptionDto): Promise<Inscription> {
    const utilisateur = await this.userRepository.findOne({ where: { id: data.utilisateur_id } });
    if (!utilisateur) throw new NotFoundException('Utilisateur non trouvé');

    const adminBlocId = this.getBlocId();
    if (adminBlocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    // Vérification de sécurité : la classe doit appartenir au bloc de l'admin
    const classe = await this.classeRepository.findOne({ where: { id: data.classe_id, blocId: adminBlocId } });
    if (!classe) {
      throw new ForbiddenException(`La classe avec l'ID ${data.classe_id} n'existe pas dans votre établissement.`);
    }

    const annee_scolaire = await this.anneeScolaireRepository.findOne({ where: { id: data.annee_scolaire_id } });
    if (!annee_scolaire) throw new NotFoundException('Année scolaire non trouvée');

    const inscription = this.inscriptionRepository.create({
      utilisateurId: utilisateur.id,
      classeId: classe.id,
      anneeScolaireId: annee_scolaire.id,
      actif: data.actif ?? true,
      blocId: classe.blocId,
    });

    const savedInscription = await this.inscriptionRepository.save(inscription);

    // Donner à l'utilisateur l'accès au bloc de la classe
    const existingAccess = await this.utilisateurBlocRepository.findOne({
      where: {
        utilisateur: { id: utilisateur.id },
        bloc: { id: classe.blocId },
      },
    });

    if (!existingAccess) {
      const newAccess = this.utilisateurBlocRepository.create({
        utilisateur: { id: utilisateur.id },
        bloc: { id: classe.blocId },
      });
      await this.utilisateurBlocRepository.save(newAccess);
    }

    return this.findOne(savedInscription.id);
  }

  async findAll(
    filters?: { utilisateurId?: number; classeId?: number; anneeScolaireId?: number },
  ): Promise<Inscription[]> {
    const blocId = this.getBlocId();
    if (!blocId) {
      this.logger.warn("[findAll] Aucun blocId fourni, retour d'une liste vide.");
      return [];
    }

    if (filters?.utilisateurId) {
      await this.verifyParentAccess(filters.utilisateurId);
    }

    const where: FindOptionsWhere<Inscription> = { actif: true, blocId };

    if (filters?.utilisateurId) where.utilisateurId = filters.utilisateurId;
    if (filters?.classeId) where.classeId = filters.classeId;
    if (filters?.anneeScolaireId) where.anneeScolaireId = filters.anneeScolaireId;

    return this.inscriptionRepository
      .createQueryBuilder('inscription')
      .leftJoinAndSelect("inscription.utilisateur", "utilisateur")
      .leftJoinAndSelect("inscription.classe", "classe")
      .leftJoinAndSelect("inscription.annee_scolaire", "annee_scolaire")
      .where(where)
      .getMany();
  }

  async update(id: number, updateDto: Partial<CreateInscriptionDto>): Promise<Inscription> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    const inscription = await this.inscriptionRepository.findOne({
      where: { id, blocId },
      relations: ['utilisateur', 'classe', 'annee_scolaire'],
    });

    if (!inscription) {
      throw new NotFoundException(
        `Inscription avec l'ID ${id} introuvable dans ce bloc.`,
      );
    }

    // Mettre à jour les relations si elles sont fournies
    if (updateDto.utilisateur_id) {
      const utilisateur = await this.userRepository.findOne({ where: { id: updateDto.utilisateur_id } });
      if (!utilisateur) throw new NotFoundException('Utilisateur non trouvé');
      inscription.utilisateur = utilisateur;
      inscription.utilisateurId = utilisateur.id;
    }

    if (updateDto.classe_id) {
      const classe = await this.classeRepository.findOne({ where: { id: updateDto.classe_id, blocId: blocId } });
      if (!classe) throw new NotFoundException('Classe non trouvée');
      inscription.classe = classe;
      inscription.classeId = classe.id;
      inscription.blocId = classe.blocId;
    }

    if (updateDto.annee_scolaire_id) {
      const annee_scolaire = await this.anneeScolaireRepository.findOne({
        where: { id: updateDto.annee_scolaire_id },
      });
      if (!annee_scolaire) throw new NotFoundException('Année scolaire non trouvée');
      inscription.annee_scolaire = annee_scolaire;
      inscription.anneeScolaireId = annee_scolaire.id;
    }

    if (updateDto.actif !== undefined) {
      inscription.actif = updateDto.actif;
    }

    return await this.inscriptionRepository.save(inscription);
  }

  async findOne(id: number): Promise<Inscription> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new NotFoundException(`Inscription avec l'ID ${id} non trouvée car aucun bloc n'est sélectionné.`);
    }
    const inscription = await this.inscriptionRepository.findOne({
      where: { id, blocId },
      relations: ['utilisateur', 'classe', 'annee_scolaire'],
    });

    if (!inscription) {
      throw new NotFoundException(
        `Inscription avec l'ID ${id} introuvable dans ce bloc.`,
      );
    }

    if (inscription.utilisateurId) {
      await this.verifyParentAccess(inscription.utilisateurId);
    }

    return inscription;
  }

  async remove(id: number): Promise<void> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }
    await this.findOne(id); // This performs the security check and ensures the inscription exists in the bloc.
    const result = await this.inscriptionRepository.delete({ id, blocId });
    if (result.affected === 0) {
      throw new NotFoundException(`Inscription avec l'ID ${id} non trouvée dans ce bloc.`);
    }
  }
}