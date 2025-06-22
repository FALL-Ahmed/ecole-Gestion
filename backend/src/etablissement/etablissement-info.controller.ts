import { Controller, Get, Post, Body, UsePipes, ValidationPipe, NotFoundException, HttpCode, HttpStatus } from '@nestjs/common';
import { EtablissementInfoService } from './etablissement-info.service';
import { CreateOrUpdateEtablissementInfoDto } from './dto/etablissement-info.dto';
import { EtablissementInfo } from './etablissement-info.entity';

@Controller('api/establishment-info') // Chemin de base pour ce contrôleur
export class EtablissementInfoController {
  constructor(private readonly etablissementInfoService: EtablissementInfoService) {}

  @Get()
  async findOne(): Promise<EtablissementInfo> {
    const info = await this.etablissementInfoService.findOne();
    if (!info) {
      // Si le service retourne null (aucune info trouvée), lever une exception 404
      // Le frontend s'attend à un 404 s'il n'y a pas de configuration.
      throw new NotFoundException('Aucune information d\'établissement configurée.');
    }
    return info;
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @HttpCode(HttpStatus.OK) // Retourne 200 OK pour POST car il s'agit d'une création/mise à jour d'une ressource singleton
  async createOrUpdate(
    @Body() dto: CreateOrUpdateEtablissementInfoDto,
  ): Promise<EtablissementInfo> {
    try {
      return await this.etablissementInfoService.createOrUpdate(dto);
    } catch (error) {
        // Gérer d'autres erreurs potentielles ici si nécessaire
        console.error("Error in createOrUpdate establishment info:", error);
        throw error; // Relancer l'erreur pour que Nest la gère
    }
  }
}
