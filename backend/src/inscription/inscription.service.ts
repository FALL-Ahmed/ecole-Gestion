import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inscription } from './inscription.entity';
import { CreateInscriptionDto } from './dto/create-inscription.dto';
import { User } from '../users/user.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { UserRole } from '../users/user.entity'; // Assurez-vous que le chemin et la valeur de UserRole sont corrects

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

    // FIX: Utilise les IDs des entités liées pour créer l'inscription.
    // TypeORM utilisera ces IDs pour remplir les colonnes de clés étrangères.
    const inscription = this.inscriptionRepository.create({
      utilisateurId: utilisateur.id,      // ID de l'utilisateur
      classeId: classe.id,               // ID de la classe
      anneeScolaireId: annee_scolaire.id, // ID de l'année scolaire
      actif: data.actif ?? true,         // 'actif' est maintenant un boolean, utilise 'true' comme valeur par défaut
    });

    // Optionnel: Si vous avez besoin de retourner l'objet 'inscription' avec les relations
    // complètes immédiatement après la création (sans nouvelle requête DB), vous pouvez
    // réassigner les objets de relation ici. Le .save() gérera la persistance des IDs.
    inscription.utilisateur = utilisateur;
    inscription.classe = classe;
    inscription.annee_scolaire = annee_scolaire;

    return await this.inscriptionRepository.save(inscription);
  }

  async findAll(filters?: { utilisateurId?: number; classeId?: number; anneeScolaireId?: number }): Promise<Inscription[]> {
     const queryBuilder = this.inscriptionRepository.createQueryBuilder("inscription")
      .leftJoinAndSelect("inscription.utilisateur", "utilisateur")
      .leftJoinAndSelect("inscription.classe", "classe")
      .leftJoinAndSelect("inscription.annee_scolaire", "annee_scolaire")
      .where("inscription.actif = :actif", { actif: 1 });


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