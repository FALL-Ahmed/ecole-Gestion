// src/configuration/configuration.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ConfigurationService } from './configuration.service';

class UpdateConfigurationDto {
  annee_scolaire: {
    id: number;
  };
}

@Controller('api/configuration')
export class ConfigurationController {
  constructor(private readonly configService: ConfigurationService) {}

  @Get()
  async getConfiguration() {
    return this.configService.getConfiguration();
  }

  @Post()
  async saveOrUpdateConfiguration(
    @Body() body: UpdateConfigurationDto
  ) {
    const anneeScolaireId = body.annee_scolaire.id;
    return this.configService.upsertConfiguration(anneeScolaireId);
  }
}