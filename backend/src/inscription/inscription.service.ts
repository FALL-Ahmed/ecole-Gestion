import {
  Injectable,
  NotFoundException,
  Scope,
  Inject,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inscription } from './inscription.entity';
import { CreateInscriptionDto } from './dto/create-inscription.dto';
import { User } from '../users/user.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { UserRole } from '../users/user.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { UtilisateurBloc } from '../users/utilisateur-bloc.entity';
@Injectable({ scope: Scope.REQUEST })
export class InscriptionService {
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
    if (!user || !user.blocId) {
      // Pour les rôles comme superadmin ou parent qui n'ont pas de blocId,
      // on retourne null au lieu de lancer une erreur.
      return null;
    }
    return user.blocId;
  }

  async create(data: CreateInscriptionDto): Promise<Inscription> {
    const utilisateur = await this.userRepository.findOne({ where: { id: data.utilisateur_id } });
    if (!utilisateur) throw new NotFoundException('Utilisateur non trouvé');

    const classe = await this.classeRepository.findOne({ where: { id: data.classe_id } });
    if (!classe) throw new NotFoundException('Classe non trouvée');

    const annee_scolaire = await this.anneeScolaireRepository.findOne({ where: { id: data.annee_scolaire_id } });
    if (!annee_scolaire) throw new NotFoundException('Année scolaire non trouvée');

    if (!classe.blocId) {
      throw new ConflictException(
        `La classe '${classe.nom}' n'est associée à aucun bloc. Inscription impossible.`,
      );
    }

    const inscription = this.inscriptionRepository.create({
      utilisateurId: utilisateur.id,
      classeId: classe.id,
      anneeScolaireId: annee_scolaire.id,
      actif: data.actif ?? true,
      blocId: classe.blocId, // Assigner automatiquement le bloc de la classe
    });

    const savedInscription = await this.inscriptionRepository.save(inscription);

    // **NOUVELLE LOGIQUE : Donner à l'utilisateur l'accès au bloc**
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
    // **FIN DE LA NOUVELLE LOGIQUE**

    // Re-fetch avec les relations pour retourner l'objet complet
    return this.findOne(savedInscription.id);
  }

  async findAll(filters?: { utilisateurId?: number; classeId?: number; anneeScolaireId?: number }): Promise<Inscription[]> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      return []; // Retourne une liste vide si aucun bloc n'est sélectionné
    }
    const queryBuilder = this.inscriptionRepository
      .createQueryBuilder('inscription')
      .leftJoinAndSelect("inscription.utilisateur", "utilisateur")
      .leftJoinAndSelect("inscription.classe", "classe")
      .leftJoinAndSelect("inscription.annee_scolaire", "annee_scolaire")
      .where('inscription.actif = :actif', { actif: 1 })
      .andWhere('inscription.blocId = :blocId', { blocId }); // FILTRE PAR BLOC


    if (filters?.utilisateurId) {
       // Filtre directement sur la colonne utilisateurId de l'entité Inscription
      queryBuilder.andWhere("inscription.utilisateurId = :utilisateurId", { utilisateurId: filters.utilisateurId });
    } else {
      // Si aucun utilisateurId spécifique n'est fourni, filtre par rôle sur l'entité User jointe
      queryBuilder.andWhere("utilisateur.role = :role", { role: UserRole.ETUDIANT });
    }

    if (filters?.classeId) {
     // Filtre directement sur la colonne classeId de l'entité Inscription
      queryBuilder.andWhere("inscription.classeId = :classeId", { classeId: filters.classeId });
    }
    if (filters?.anneeScolaireId) {
     // Filtre directement sur la colonne anneeScolaireId de l'entité Inscription
      queryBuilder.andWhere("inscription.anneeScolaireId = :anneeScolaireId", { anneeScolaireId: filters.anneeScolaireId });
    }

        return queryBuilder.getMany();

  }

  async update(id: number, updateDto: Partial<CreateInscriptionDto>): Promise<Inscription> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new NotFoundException(`Inscription avec l'ID ${id} introuvable car aucun bloc n'est sélectionné.`);
    }
    const inscription = await this.inscriptionRepository.findOne({
      where: { id, blocId }, // Vérifie que l'inscription est dans le bon bloc
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
      const classe = await this.classeRepository.findOne({ where: { id: updateDto.classe_id } });
      if (!classe) throw new NotFoundException('Classe non trouvée');
      if (classe.blocId !== blocId) {
        throw new ConflictException(
          "Impossible de déplacer une inscription vers une classe d'un autre bloc.",
        );
      }
      inscription.classe = classe;
      inscription.classeId = classe.id;
      inscription.blocId = classe.blocId; // Mettre à jour le blocId si la classe change
    }

    if (updateDto.annee_scolaire_id) {
      const annee_scolaire = await this.anneeScolaireRepository.findOne({
        where: { id: updateDto.annee_scolaire_id },
      });
      if (!annee_scolaire) throw new NotFoundException('Année scolaire non trouvée');
      inscription.annee_scolaire = annee_scolaire;
      inscription.anneeScolaireId = annee_scolaire.id;
    }

    // Mettre à jour le statut actif si fourni
    if (updateDto.actif !== undefined) {
      inscription.actif = updateDto.actif;
    }

    return await this.inscriptionRepository.save(inscription);
  }

  async findOne(id: number): Promise<Inscription> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new NotFoundException(`Inscription avec l'ID ${id} introuvable car aucun bloc n'est sélectionné.`);
    }
    const inscription = await this.inscriptionRepository.findOne({
      where: { id, blocId }, // Vérifie que l'inscription est dans le bon bloc
      relations: ['utilisateur', 'classe', 'annee_scolaire'],
    });

    if (!inscription) {
      throw new NotFoundException(
        `Inscription avec l'ID ${id} introuvable dans ce bloc.`,
      );
    }

    return inscription;
  }

  async remove(id: number): Promise<void> {
    // findOne vérifie déjà que l'inscription appartient au bloc de l'utilisateur
    await this.findOne(id);
    await this.inscriptionRepository.delete(id);
  }
}