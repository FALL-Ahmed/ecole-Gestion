import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, In } from 'typeorm';
import { Absence } from './absence.entity';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';
import { BulkCreateAbsenceDto } from './dto/bulk-create-absence.dto';
import { AuditLogService } from '../historique/historique.service'; // adapte le chemin
import { User}from '../users/user.entity';
import { Classe } from '../classe/classe.entity';

@Injectable()
export class AbsenceService {
  constructor(
    @InjectRepository(Absence)
    private readonly absenceRepository: Repository<Absence>,

    private readonly auditLogService: AuditLogService, // Injection du service d’audit
    @InjectRepository(User)
    private readonly utilisateurRepository: Repository<User>,
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    
  ) {}

  async create(createAbsenceDto: CreateAbsenceDto, utilisateurId: number): Promise<Absence> {
    const absence = this.absenceRepository.create(createAbsenceDto);
    const saved = await this.absenceRepository.save(absence);
// Re-fetch to get relations for the log
    const fullAbsence = await this.findOne(saved.id);
    const nomEleve = fullAbsence.etudiant ? `${fullAbsence.etudiant.prenom} ${fullAbsence.etudiant.nom}` : `ID ${saved.etudiant_id}`;
    const nomClasse = fullAbsence.classe ? fullAbsence.classe.nom : `ID ${saved.classe_id}`;

    

    // Audit création
await this.auditLogService.logAction({
        userId: utilisateurId,
      action: 'CREATE',
      entite: 'Absence',
      entiteId: saved.id,
      description: `Nouvelle absence pour l'élève ${nomEleve} (Classe: ${nomClasse}) enregistrée.`,
      details: fullAbsence,
    });

    return saved;
  }

  async createOrUpdateBulk(
    bulkDto: BulkCreateAbsenceDto,
    utilisateurId: number,
  ): Promise<{ created: number; updated: number; deleted: number }> {
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
// --- Pré-chargement des données pour l'historique ---
    const studentIds = [...new Set(bulkDto.details.map(d => d.etudiant_id))];
    const students = await this.utilisateurRepository.find({ where: { id: In(studentIds) } });
    const classe = await this.classeRepository.findOne({ where: { id: bulkDto.classe_id } });

    const studentMap = new Map(students.map(s => [s.id, s]));
    const className = classe ? classe.nom : `ID ${bulkDto.classe_id}`;
    // --- Fin du pré-chargement ---

    for (const detail of bulkDto.details) {
      const student = studentMap.get(detail.etudiant_id);
      const studentName = student ? `${student.prenom} ${student.nom}` : `ID ${detail.etudiant_id}`;


      if (detail.existingAbsenceId && detail.present) {
        // Suppression absence si présent
        const deleteResult = await this.absenceRepository.delete(detail.existingAbsenceId);
        if (deleteResult.affected && deleteResult.affected > 0) {
          deletedCount++;
await this.auditLogService.logAction({
            userId: utilisateurId,
            action: 'DELETE',
            entite: 'Absence',
            entiteId: detail.existingAbsenceId,
            description: `Absence pour l'élève ${studentName} (Classe: ${className}) supprimée.`,
            details: detail,
          });
        }
      } else if (!detail.present) {
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
          // Mise à jour
          await this.absenceRepository.update(detail.existingAbsenceId, absenceData);
          updatedCount++;
await this.auditLogService.logAction({
              userId: utilisateurId,
            action: 'UPDATE',
            entite: 'Absence',
            entiteId: detail.existingAbsenceId,
            description: `Absence pour l'élève ${studentName} (Classe: ${className}) mise à jour.`,
            details: { avant: detail.existingAbsenceId, apres: absenceData },
          });
        } else {
          // Création
          const newAbsence = this.absenceRepository.create(absenceData);
          const savedAbsence = await this.absenceRepository.save(newAbsence);
          createdCount++;
await this.auditLogService.logAction({
            userId: utilisateurId,
            action: 'CREATE',
            entite: 'Absence',
            entiteId: savedAbsence.id,
            description: `Nouvelle absence pour l'élève ${studentName} (Classe: ${className}) enregistrée.`,
            details: savedAbsence,
          });

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
    heure_fin_param?: string,
    search?: string,
  ): Promise<Absence[]> {
    const where: any = {};

    if (classe_id) where.classe_id = classe_id;
    if (annee_scolaire_id) where.annee_scolaire_id = annee_scolaire_id;
    if (etudiant_id) where.etudiant_id = etudiant_id;
    if (matiere_id) where.matiere_id = matiere_id;
    if (heure_debut) where.heure_debut = heure_debut;
    if (heure_fin_param) where.heure_fin = heure_fin_param;

    if (date_debut && date_fin) {
      where.date = Between(date_debut, date_fin);
    } else if (date_debut) {
      where.date = date_debut;
    }

    if (search) {
      return this.absenceRepository.find({
        where: [
          { ...where, etudiant: { nom: ILike(`%${search}%`) } },
          { ...where, etudiant: { prenom: ILike(`%${search}%`) } },
          { ...where, justification: ILike(`%${search}%`) },
        ],
        relations: ['etudiant', 'matiere', 'classe', 'anneeScolaire'],
        order: { date: 'DESC', heure_debut: 'ASC' },
      });
    }

    return this.absenceRepository.find({
      where,
      relations: ['etudiant', 'matiere', 'classe', 'anneeScolaire'],
      order: { date: 'DESC', heure_debut: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Absence> {
    const absence = await this.absenceRepository.findOne({
      where: { id },
      relations: ['etudiant', 'matiere', 'classe', 'anneeScolaire'],
    });
    if (!absence) {
      throw new NotFoundException(`Absence with ID ${id} not found`);
    }
    return absence;
  }

  async update(id: number, updateAbsenceDto: UpdateAbsenceDto, utilisateurId: number): Promise<Absence> {
    const absence = await this.findOne(id);
        const originalAbsence = { ...absence };

    if (updateAbsenceDto.justifie !== undefined) {
      absence.justifie = updateAbsenceDto.justifie;
    }
    if (updateAbsenceDto.justification !== undefined) {
      absence.justification = updateAbsenceDto.justification;
    }
 const updatedAbsence = await this.absenceRepository.save(absence);

    const nomEleve = updatedAbsence.etudiant ? `${updatedAbsence.etudiant.prenom} ${updatedAbsence.etudiant.nom}` : `ID ${updatedAbsence.etudiant_id}`;
    const nomClasse = updatedAbsence.classe ? updatedAbsence.classe.nom : `ID ${updatedAbsence.classe_id}`;
    const description = `Absence pour l'élève ${nomEleve} (Classe: ${nomClasse}) mise à jour. Justification: "${updatedAbsence.justification}".`;

await this.auditLogService.logAction({
        userId: utilisateurId,
      action: 'UPDATE',
      entite: 'Absence',
      entiteId: id,
      description: description,
      details: { avant: originalAbsence, apres: updatedAbsence },
    });

    return updatedAbsence;
    }

 async remove(id: number, utilisateurId: number): Promise<void> {
    // La méthode remove a déjà été mise à jour dans la réponse précédente.
    // Je la laisse ici pour la cohérence.
    const absence = await this.findOne(id); // findOne inclut les relations
    const nomEleve = absence.etudiant ? `${absence.etudiant.prenom} ${absence.etudiant.nom}` : `ID ${absence.etudiant_id}`;
    const nomClasse = absence.classe ? absence.classe.nom : `ID ${absence.classe_id}`;

await this.auditLogService.logAction({      userId: utilisateurId,
      action: 'DELETE',
      entite: 'Absence',
      entiteId: id,
      description: `Absence pour l'élève ${nomEleve} (Classe: ${nomClasse}) supprimée.`,
      details: absence,
    });    const result = await this.absenceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Absence with ID ${id} not found`);
    }
  }
}
