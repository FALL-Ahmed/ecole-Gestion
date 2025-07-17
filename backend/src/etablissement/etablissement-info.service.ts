import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtablissementInfo } from './etablissement-info.entity';
import { CreateOrUpdateEtablissementInfoDto } from './dto/etablissement-info.dto';

@Injectable()
export class EtablissementInfoService {
  private readonly FIXED_ID = 1;

  constructor(
    @InjectRepository(EtablissementInfo)
    private readonly etablissementInfoRepository: Repository<EtablissementInfo>,
  ) {}

  async findOne(): Promise<EtablissementInfo | null> {
    const info = await this.etablissementInfoRepository.findOneBy({ id: this.FIXED_ID });
    if (!info) {
      // Optionnel: retourner un objet par défaut ou null si aucune info n'est configurée
      // throw new NotFoundException('Les informations de l\'établissement n\'ont pas été trouvées.');
      return null; // Le contrôleur gérera le 404 si null est retourné
    }
    return info;
  }
async getSchoolName(): Promise<string> {
    try {
      // On suppose qu'il n'y a qu'une seule ligne pour les informations de l'établissement.
      const info = await this.findOne();

      if (info?.schoolName) {
        return info.schoolName;
      }
      
      console.warn("Le nom de l'établissement n'a pas été trouvé. Utilisation d'une valeur par défaut.");
      return "L'Administration Scolaire"; // Valeur par défaut
    } catch (error) {
      console.error("Erreur lors de la récupération du nom de l'établissement:", error);
      return "L'Administration Scolaire"; // Valeur par défaut en cas d'erreur
    }
  }
 
   /**
   * Récupère le nom et le numéro de téléphone de l'école, optimisé pour les notifications.
   * @returns Un objet contenant `schoolName` et `schoolPhone`.
   */
  async getNotificationDetails(): Promise<{ schoolName: string; schoolPhone: string | null }> {
    const info = await this.findOne();
    return {
      schoolName: info?.schoolName || "L'Administration Scolaire",
      schoolPhone: info?.phone || null,
    };
  }
  
  async createOrUpdate(
    dto: CreateOrUpdateEtablissementInfoDto,
  ): Promise<EtablissementInfo> {
    let info = await this.etablissementInfoRepository.findOneBy({ id: this.FIXED_ID });

    if (info) {
      // Mise à jour
      Object.assign(info, dto);
    } else {
      // Création
      info = this.etablissementInfoRepository.create({
        ...dto,
        id: this.FIXED_ID, // S'assurer que l'ID est bien 1
      });
    }

    return this.etablissementInfoRepository.save(info);
  }
}
