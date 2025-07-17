// src/disciplinary-records/disciplinary-records.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDisciplinaryRecordDto } from './dto/create-disciplinary-record.dto';
import { DisciplinaryRecord } from './disciplinary-record.entity';
import { TwilioService } from '../twilo/twilio.service';
import { User } from '../users/user.entity';
import { EtablissementInfoService } from '../etablissement/etablissement-info.service';

@Injectable()
export class DisciplinaryRecordsService {
  constructor(
    @InjectRepository(DisciplinaryRecord)
    private readonly repo: Repository<DisciplinaryRecord>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly twilioService: TwilioService,
    private readonly etablissementInfoService: EtablissementInfoService,

  ) {}

  async create(createDto: CreateDisciplinaryRecordDto) {
    // 1. Sauvegarde en base
   const record = this.repo.create({
    student: { id: createDto.studentId },
    class: { id: createDto.classId },
    schoolYear: { id: createDto.schoolYearId },
    reason: createDto.reason,
    date: new Date(createDto.date), // Utilisez la date du DTO au lieu de new Date()

    // La date est automatique via @Column()
  });
    const savedRecord = await this.repo.save(record);

    // 2. Notification WhatsApp
    try {
 const { schoolName, schoolPhone } =
        await this.etablissementInfoService.getNotificationDetails();

      const student = await this.userRepo.findOne({
        where: { id: createDto.studentId }
      });

      if (student?.tuteurTelephone) {
        const message = this.generateWhatsAppMessage(
          student.tuteurNom || 'Tuteur',
          `${student.prenom} ${student.nom}`,
                     createDto.reason,
          schoolName,
          schoolPhone,
        );


        await this.twilioService.sendWhatsAppMessage(
          student.tuteurTelephone,
          message
        );
      }
    } catch (error) {
      console.error('Erreur notification:', error);
    }

    return savedRecord;
  }

async findByClass(classId: number) {
  return this.repo.find({
    where: { class: { id: classId } },
    relations: ['student', 'class', 'schoolYear'],
    select: {
      id: true,
      reason: true,
      date: true,
      student: { id: true, nom: true, prenom: true },
      class: { id: true, nom: true },
      schoolYear: { id: true, libelle: true }
    }
  });
}

  private generateWhatsAppMessage(
  tuteurNom: string,
  studentName: string,
reason: string,
  schoolName: string | null,
  schoolPhone: string | null,
): string {
  // 1. Normalisation des entrées
  const normalizedTuteur = tuteurNom.trim() || 'Tuteur';
  const normalizedStudent = studentName.trim();
  const normalizedReason = reason.trim();
const normalizedSchoolName = (schoolName || "L'Administration Scolaire").trim();
  const normalizedSchoolPhone = (schoolPhone || '').trim();

  // 2. Template avec emojis pertinents
  return `🔔 *Notification de Sanction Scolaire* 🔔\n\n` +
  `Bonjour ${normalizedTuteur},\n\n` +
  `Nous vous informons que votre enfant *${normalizedStudent}* a reçu une sanction disciplinaire.\n\n` +
  `📌 *Motif de la sanction* :\n${normalizedReason}\n\n` +
  `📅 *Date de l'incident* : ${new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}\n\n` +
    `ℹ️ *Pour toute information* :\n` +
        (normalizedSchoolPhone
      ? `- Contactez l'établissement au : ${normalizedSchoolPhone}\n`
      : `- Contactez l'établissement\n`) +
    
  `Cordialement,\n` +
  `*L'équipe administrative de ${normalizedSchoolName}*`;
}
}