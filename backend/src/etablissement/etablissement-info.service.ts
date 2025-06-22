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
