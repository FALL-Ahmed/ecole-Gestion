import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import { ProfessorAbsence } from './professor-absence.entity';

@Injectable()
export class ProfessorAbsencesService {
  constructor(
    @InjectRepository(ProfessorAbsence)
    private readonly absenceRepository: Repository<ProfessorAbsence>,
  ) {}

 async findAll(query: any): Promise<ProfessorAbsence[]> {
    const { date, annee_scolaire_id, date_debut, date_fin } = query;
    const options: FindManyOptions<ProfessorAbsence> = {
      relations: ['professeur'], // Ajoutez les relations nécessaires
      where: {},
    };

    if (annee_scolaire_id) {
      options.where = { ...options.where, anneeScolaireId: annee_scolaire_id };
    }

    if (date) {
      options.where = { ...options.where, date: date };
    }

    if (date_debut && date_fin) {
      // Convertir les dates en format Date si nécessaire
      const startDate = new Date(date_debut);
      const endDate = new Date(date_fin);
      endDate.setHours(23, 59, 59); // Pour inclure toute la journée
      
      options.where = { 
        ...options.where, 
        date: Between(startDate.toISOString(), endDate.toISOString()) 
      };
    }
    
    const absences = await this.absenceRepository.find(options);
    
    // Formater les données pour inclure les relations
    return absences.map(absence => ({
      ...absence,
      professeur_nom: absence.professeur ? `${absence.professeur.prenom} ${absence.professeur.nom}` : 'Inconnu',
    }));
  }
  
  async createOrUpdateBulk(dto: { date: string; annee_scolaire_id: number; details: any[] }): Promise<any> {
    const { date, annee_scolaire_id, details } = dto;
    const results = [];

    for (const detail of details) {
      if (detail.present) {
        if (detail.existingAbsenceId) {
          await this.absenceRepository.delete(detail.existingAbsenceId);
          results.push({ professeur_id: detail.professeur_id, status: 'deleted' });
        }
      } else {
        const absenceData: Partial<ProfessorAbsence> = {
          professeurId: detail.professeur_id,
          anneeScolaireId: annee_scolaire_id,
          date: date,
          heure_debut: detail.heure_debut,
          heure_fin: detail.heure_fin,
          justified: detail.justified,
          justification: detail.justification,
        };

        if (detail.existingAbsenceId) {
          await this.absenceRepository.update(detail.existingAbsenceId, absenceData);
          const updated = await this.absenceRepository.findOne({ where: { id: detail.existingAbsenceId } });
          results.push(updated);
        } else {
          const newAbsence = this.absenceRepository.create(absenceData);
          const saved = await this.absenceRepository.save(newAbsence);
          results.push(saved);
        }
      }
    }
    return { message: 'Attendance processed successfully', results };
  }

  async update(id: number, dto: { justifie: boolean; justification: string }): Promise<ProfessorAbsence> {
    const absence = await this.absenceRepository.findOne({ where: { id } });
    if (!absence) {
      throw new NotFoundException(`Absence with ID ${id} not found`);
    }

    absence.justified = dto.justifie;
    absence.justification = dto.justification;

    return this.absenceRepository.save(absence);
  }
}

