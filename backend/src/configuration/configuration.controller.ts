// src/configuration/configuration.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  ParseIntPipe,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigurationService } from './configuration.service';

// Ce DTO (Data Transfer Object) doit correspondre au corps de la requête envoyé par le frontend.
// Le frontend envoie { "annee_scolaire_id": ... }, donc le DTO doit avoir cette forme.
class ConfigurationDto {
  annee_scolaire_id: number;

}

@Controller('api/configuration')
export class ConfigurationController {
  constructor(private readonly configService: ConfigurationService) {}

  @Get()
  async getConfiguration() {
    return this.configService.getConfiguration();
  }

  @Post()
 async createConfiguration(
    @Body() body: ConfigurationDto
  ) {

   // C'est une bonne pratique d'empêcher la création d'une configuration si elle existe déjà.
    const existingConfig = await this.configService.getConfiguration();
    if (existingConfig && (!Array.isArray(existingConfig) || existingConfig.length > 0)) {
      throw new ConflictException('Une configuration existe déjà. Utilisez PUT /api/configuration/:id pour la mettre à jour.');
    }
    return this.configService.createConfiguration(body.annee_scolaire_id);
  }

  // PUT /api/configuration/:id - Utilisé pour METTRE À JOUR la configuration existante
  @Put(':id')
  async updateConfiguration(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ConfigurationDto
  ) {
    return this.configService.updateConfiguration(id, body.annee_scolaire_id);
  }
}