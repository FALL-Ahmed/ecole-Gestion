import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Affectation } from './affectation.entity';
import { User } from '../users/user.entity'; // Assuming User entity path
import { Matiere } from '../matieres/matiere.entity'; // Assuming Matiere entity path
import { Classe } from '../classe/classe.entity'; // Assuming Classe entity path
import { anneescolaire } from '../annee-academique/annee-academique.entity'; // Assuming anneescolaire entity path

@Injectable()
export class AffectationService {
  constructor(
    @InjectRepository(Affectation)
    private affectationRepository: Repository<Affectation>,
  ) {}

  async findAll(): Promise<Affectation[]> {
    return this.affectationRepository.find({
      relations: ['professeur', 'matiere', 'classe', 'annee_scolaire'], // Eager load relations if needed
    });
  }

  async findById(id: number): Promise<Affectation> {
    const affectation = await this.affectationRepository.findOne({
      where: { id },
      relations: ['professeur', 'matiere', 'classe', 'annee_scolaire'],
    });
    if (!affectation) {
      throw new NotFoundException(`Affectation with ID ${id} not found.`);
    }
    return affectation;
  }

  // New method to find affectations by professeur_id
  async findByProfesseurId(professeurId: number): Promise<Affectation[]> {
    return this.affectationRepository.find({
      where: { professeur: { id: professeurId } },
      // Make sure 'matiere' is included in relations to get the subject details
      relations: ['professeur', 'matiere', 'classe', 'annee_scolaire'],
    });
  }

  async create(data: { professeur_id: number; matiere_id: number; classe_id: number; annee_id: number }): Promise<Affectation> {
    const { professeur_id, matiere_id, classe_id, annee_id } = data;

    // Create partial entities for relations
    const professeur = new User();
    professeur.id = professeur_id;

    const matiere = new Matiere();
    matiere.id = matiere_id;

    const classe = new Classe();
    classe.id = classe_id;

    const anneeScolaire = new anneescolaire();
    anneeScolaire.id = annee_id;

    const newAffectation = this.affectationRepository.create({
      professeur,
      matiere,
      classe,
      annee_scolaire: anneeScolaire,
    });
    return this.affectationRepository.save(newAffectation);
  }

  async delete(id: number): Promise<void> {
    const result = await this.affectationRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Affectation with ID ${id} not found.`);
    }
  }
}