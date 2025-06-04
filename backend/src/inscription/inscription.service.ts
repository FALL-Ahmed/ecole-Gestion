import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inscription } from './inscription.entity';
import { CreateInscriptionDto } from './dto/create-inscription.dto';
import { User } from '../users/user.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Injectable()
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
  ) {}

  async create(data: CreateInscriptionDto): Promise<Inscription> {
    const utilisateur = await this.userRepository.findOne({ where: { id: data.utilisateur_id } });
    if (!utilisateur) throw new NotFoundException('Utilisateur non trouvé');

    const classe = await this.classeRepository.findOne({ where: { id: data.classe_id } });
    if (!classe) throw new NotFoundException('Classe non trouvée');

    const annee_scolaire = await this.anneeScolaireRepository.findOne({ where: { id: data.annee_scolaire_id } });
    if (!annee_scolaire) throw new NotFoundException('Année scolaire non trouvée');

    const inscription = this.inscriptionRepository.create({
      utilisateur,
      classe,
      annee_scolaire,
      actif: data.actif ?? true,
    });

    return await this.inscriptionRepository.save(inscription);
  }

  async findAll(): Promise<Inscription[]> {
    return this.inscriptionRepository.find({
      relations: ['utilisateur', 'classe', 'annee_scolaire'],
    });
  }

  async findByClasseAndAnnee(classeId: number, anneeScolaireId: number): Promise<Inscription[]> {
    return this.inscriptionRepository.find({
      where: {
        classe: { id: classeId },
        annee_scolaire: { id: anneeScolaireId },
      },
      relations: ['utilisateur', 'classe', 'annee_scolaire'],
    });
  }

  async findOne(id: number): Promise<Inscription> {
    const inscription = await this.inscriptionRepository.findOne({
      where: { id },
      relations: ['utilisateur', 'classe', 'annee_scolaire'],
    });

    if (!inscription) {
      throw new NotFoundException(`Inscription avec l'ID ${id} introuvable.`);
    }

    return inscription;
  }

  async remove(id: number): Promise<void> {
    await this.inscriptionRepository.delete(id);
  }
}
