import {
  Injectable,
  NotFoundException,
  Scope,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Classe } from './classe.entity';
import { Niveau } from './classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class ClasseService {
  constructor(
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(anneescolaire)
    private readonly anneeScolaireRepository: Repository<anneescolaire>,
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

  async findAll(): Promise<Classe[]> {
  const blocId = this.getBlocId();
  console.log('Current blocId:', blocId); // Debug log
  
  if (blocId === null) {
    console.log('No blocId, returning empty array');
    return [];
  }

  try {
    const classes = await this.classeRepository
      .createQueryBuilder('classe')
      .leftJoinAndSelect('classe.anneeScolaire', 'anneeScolaire')
      .where('classe.blocId = :blocId', { blocId })
      .orderBy('classe.nom', 'ASC')
      .getMany();
    
    console.log('Found classes:', classes.length);
    return classes;
  } catch (error) {
    console.error('Error in findAll:', error);
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

  async createClasse(data: {
    nom: string;
    niveau: Niveau;
    description?: string;
    anneeScolaireId: number;
    frais_scolarite: number;
  }): Promise<Classe> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Impossible de créer une classe sans être dans le contexte d'un bloc.");
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

  async updateClasse(id: number, data: Partial<Classe>): Promise<Classe> {
    // On s'assure que la classe appartient bien au bloc de l'utilisateur avant de la modifier
    await this.findById(id);
    await this.classeRepository.update(id, data);
    return this.findById(id);
  }

  async deleteClasse(id: number): Promise<void> {
    // On s'assure que la classe appartient bien au bloc de l'utilisateur avant de la supprimer
    await this.findById(id);
    const result = await this.classeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Classe avec l'ID ${id} non trouvée pour suppression`);
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