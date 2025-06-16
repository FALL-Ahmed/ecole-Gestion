import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, ILike } from 'typeorm';
import { Absence } from './absence.entity';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';
import { BulkCreateAbsenceDto, AbsenceDetailDto } from './dto/bulk-create-absence.dto';

@Injectable()
export class AbsenceService {
  constructor(
    @InjectRepository(Absence)
    private absenceRepository: Repository<Absence>,
  ) {}

  async create(createAbsenceDto: CreateAbsenceDto): Promise<Absence> {
    const absence = this.absenceRepository.create(createAbsenceDto);
    return this.absenceRepository.save(absence);
  }

  async createOrUpdateBulk(bulkDto: BulkCreateAbsenceDto): Promise<{ created: number, updated: number, deleted: number }> {
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    for (const detail of bulkDto.details) {
      if (detail.existingAbsenceId && detail.present) {
        // Supprimer l'absence existante si l'étudiant est marqué présent
         const deleteResult = await this.absenceRepository.delete(detail.existingAbsenceId);
        if (deleteResult.affected && deleteResult.affected > 0) { // Vérification ajoutée
          deletedCount++;
        }
      } else if (!detail.present) {
        // L'étudiant est absent
        const absenceData = {
          date: bulkDto.date,
          heure_debut: bulkDto.heure_debut,
          heure_fin: bulkDto.heure_fin,
          etudiant_id: detail.etudiant_id,
          matiere_id: bulkDto.matiere_id,
          classe_id: bulkDto.classe_id,
          annee_scolaire_id: bulkDto.annee_scolaire_id,
          justifie: detail.justifie || false,
          justification: detail.justification || '',
        };

        if (detail.existingAbsenceId) {
          // Mettre à jour l'absence existante
          await this.absenceRepository.update(detail.existingAbsenceId, absenceData);
          updatedCount++;
        } else {
          // Créer une nouvelle absence
          const newAbsence = this.absenceRepository.create(absenceData);
          await this.absenceRepository.save(newAbsence);
          createdCount++;
        }
      }
    }
    return { created: createdCount, updated: updatedCount, deleted: deletedCount };
  }

  async findAll(
    classe_id?: number,
    annee_scolaire_id?: number,
    date_debut?: string,
    date_fin?: string,
    etudiant_id?: number,
    matiere_id?: number,
    heure_debut?: string,
    heure_fin_param?: string, // Renommé pour éviter conflit avec la variable heure_fin
    search?: string,
  ): Promise<Absence[]> {
    const where: any = {};

    if (classe_id) where.classe_id = classe_id;
    if (annee_scolaire_id) where.annee_scolaire_id = annee_scolaire_id;
    if (etudiant_id) where.etudiant_id = etudiant_id;
    if (matiere_id) where.matiere_id = matiere_id;
    if (heure_debut) where.heure_debut = heure_debut;
    if (heure_fin_param) where.heure_fin = heure_fin_param; // Utilisation du paramètre renommé

    if (date_debut && date_fin) {
      where.date = Between(date_debut, date_fin);
    } else if (date_debut) { // Si seulement date_debut est fourni, on l'utilise comme date exacte
      where.date = date_debut;
    }
    
    // Le 'search' est plus complexe car il peut s'appliquer à des champs relationnels.
    // Pour une recherche simple sur la justification :
    if (search) {
        
         return this.absenceRepository.find({
            where: [
                { ...where, etudiant: { nom: ILike(`%${search}%`) } },
                { ...where, etudiant: { prenom: ILike(`%${search}%`) } },
                { ...where, justification: ILike(`%${search}%`) },
            ],
            relations: ['etudiant', 'matiere', 'classe', 'anneeScolaire'], // Assurez-vous que les relations sont chargées
            order: { date: 'DESC', heure_debut: 'ASC' }
        });
    }

    return this.absenceRepository.find({
      where,
      relations: ['etudiant', 'matiere', 'classe', 'anneeScolaire'],
      order: { date: 'DESC', heure_debut: 'ASC' }
    });
  }

  async findOne(id: number): Promise<Absence> {
    const absence = await this.absenceRepository.findOne({ where: { id }, relations: ['etudiant', 'matiere', 'classe', 'anneeScolaire'] });
    if (!absence) {
      throw new NotFoundException(`Absence with ID ${id} not found`);
    }
    return absence;
  }

  async update(id: number, updateAbsenceDto: UpdateAbsenceDto): Promise<Absence> {
    const absence = await this.findOne(id); // Vérifie si l'absence existe
    // Ne met à jour que les champs 'justifie' et 'justification'
    if (updateAbsenceDto.justifie !== undefined) {
        absence.justifie = updateAbsenceDto.justifie;
    }
    if (updateAbsenceDto.justification !== undefined) {
        absence.justification = updateAbsenceDto.justification;
    }
    // Ne pas utiliser spread operator pour éviter d'écraser d'autres champs par inadvertance
    // Object.assign(absence, updateAbsenceDto);
    return this.absenceRepository.save(absence);
  }

  async remove(id: number): Promise<void> {
    const result = await this.absenceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Absence with ID ${id} not found`);
    }
  }
}
