// src/note/note.service.ts
import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm'; // Importer DeepPartial
import { Note } from './note.entity'; // Ajuster le chemin si nécessaire
import { CreateNoteDto } from './dto/create-note.dto';
import { Evaluation } from '../evaluation/evaluation.entity'; // Ajustez le chemin
import { User } from '../users/user.entity'; // Ou Utilisateur, ajustez le chemin

@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,

    @InjectRepository(Evaluation)
    private evaluationRepository: Repository<Evaluation>,
    @InjectRepository(User) // Assurez-vous que le nom de l'entité est correct (User ou Utilisateur)
    private userRepository: Repository<User>, // ou Utilisateur
  ) {}

  async createMultiple(createNoteDtos: CreateNoteDto[]): Promise<Note[]> {
    if (!Array.isArray(createNoteDtos) || createNoteDtos.length === 0) {
      throw new BadRequestException('Le corps de la requête doit être un tableau de notes et ne doit pas être vide.');
    }

    const notesToSave: Note[] = [];

    for (const dto of createNoteDtos) {
      // Validation de l'existence de l'évaluation
      const evaluationExists = await this.evaluationRepository.findOneBy({ id: dto.evaluation_id });
      if (!evaluationExists) {
        throw new NotFoundException(`Évaluation avec l'ID ${dto.evaluation_id} non trouvée.`);
      }

      // Validation de l'existence de l'étudiant
      const etudiantExists = await this.userRepository.findOneBy({ id: dto.etudiant_id });
      if (!etudiantExists) { // Vous pourriez aussi vérifier le rôle ici si nécessaire
        throw new NotFoundException(`Étudiant avec l'ID ${dto.etudiant_id} non trouvé.`);
      }

      const notePartial: DeepPartial<Note> = { // Expliciter le type passé à create

        note: dto.note,
      
        evaluation: { id: dto.evaluation_id } as Evaluation, // Lier par ID
        etudiant: { id: dto.etudiant_id } as User,       // Lier par ID (ou Utilisateur)
       };
      notesToSave.push(this.noteRepository.create(notePartial)); // Créer l'entité et l'ajouter au tableau
    }

    try {
      return await this.noteRepository.save(notesToSave); // Sauvegarde en masse
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de plusieurs notes:", error);
      // Vérifiez si c'est une erreur de contrainte de clé étrangère spécifique
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          throw new BadRequestException('Erreur de référence: un des IDs (évaluation ou étudiant) fournis n\'existe pas.');
      }
      throw new InternalServerErrorException('Erreur serveur lors de la création des notes.');
    }
  }

  async findAll(): Promise<Note[]> {
    return this.noteRepository.find({
      relations: ['evaluation', 'etudiant'], // Charge les relations
    });
  }

  async findByEvaluation(evaluationId: number): Promise<Note[]> {
    if (isNaN(evaluationId)) {
        throw new BadRequestException('L\'ID de l\'évaluation doit être un nombre.');
    }
    return this.noteRepository.find({
      where: { evaluation: { id: evaluationId } },
      relations: ['etudiant'], // Charge la relation étudiant
    });
  }

  async findOne(id: number): Promise<Note> {
    if (isNaN(id)) {
        throw new BadRequestException('L\'ID de la note doit être un nombre.');
    }
    const note = await this.noteRepository.findOne({
        where: { id },
        relations: ['evaluation', 'etudiant'],
    });
    if (!note) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée.`);
    }
    return note;
  }


  async update(id: number, updateData: Partial<Note>): Promise<Note> {
    if (isNaN(id)) {
        throw new BadRequestException('L\'ID de la note doit être un nombre.');
    }
    // Pour les relations, si vous voulez les mettre à jour, le payload devrait être { evaluation: { id: newEvalId } }
    // La méthode update simple ne gère pas bien les mises à jour profondes des relations.
    // Il est souvent préférable de récupérer l'entité, de la modifier, puis de la sauvegarder.

    const noteToUpdate = await this.findOne(id); // Réutilise findOne pour vérifier l'existence

    // Si updateData contient des IDs pour les relations, assurez-vous qu'ils existent
    if (updateData.evaluation && typeof updateData.evaluation === 'object' && 'id' in updateData.evaluation) {
        const evalId = (updateData.evaluation as Evaluation).id;
        const evaluationExists = await this.evaluationRepository.findOneBy({ id: evalId });
        if (!evaluationExists) {
            throw new NotFoundException(`Évaluation avec l'ID ${evalId} non trouvée pour la mise à jour.`);
        }
    }
    if (updateData.etudiant && typeof updateData.etudiant === 'object' && 'id' in updateData.etudiant) {
        const etudiantId = (updateData.etudiant as User).id; // ou Utilisateur
        const etudiantExists = await this.userRepository.findOneBy({ id: etudiantId });
        if (!etudiantExists) {
            throw new NotFoundException(`Étudiant avec l'ID ${etudiantId} non trouvé pour la mise à jour.`);
        }
    }


    // Fusionne les données de mise à jour dans l'entité existante
    this.noteRepository.merge(noteToUpdate, updateData);
    
    try {
        return await this.noteRepository.save(noteToUpdate);
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la note ${id}:`, error);
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            throw new BadRequestException('Erreur de référence lors de la mise à jour: un des IDs fournis n\'existe pas.');
        }
        throw new InternalServerErrorException('Erreur serveur lors de la mise à jour de la note.');
    }
  }

  async remove(id: number): Promise<void> {
    if (isNaN(id)) {
        throw new BadRequestException('L\'ID de la note doit être un nombre.');
    }
    const result = await this.noteRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée.`);
    }
  }
}
