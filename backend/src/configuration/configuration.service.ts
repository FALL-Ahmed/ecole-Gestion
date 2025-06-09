// src/configuration/configuration.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Configuration } from './configuration.entity';
import { Repository } from 'typeorm';
import { anneescolaire } from 'src/annee-academique/annee-academique.entity';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(Configuration)
    private readonly configurationRepository: Repository<Configuration>,

    @InjectRepository(anneescolaire)
    private readonly anneeRepository: Repository<anneescolaire>,
  ) {}

  async getConfiguration(): Promise<Configuration> {
    const config = await this.configurationRepository.findOne({
      where: { id: 1 },
      relations: ['annee_scolaire'],
    });

    if (!config) {
      throw new NotFoundException('Academic year configuration not found. Please set it up.');
    }
    return config;
  }

  async upsertConfiguration(anneeScolaireId: number): Promise<Configuration> {
    const annee = await this.anneeRepository.findOneByOrFail({ id: anneeScolaireId });

    const configToSave = this.configurationRepository.create({
      id: 1,
      annee_scolaire: annee,
    });

    const savedConfig = await this.configurationRepository.save(configToSave);

    return this.configurationRepository.findOne({
      where: { id: savedConfig.id },
      relations: ['annee_scolaire'],
    }) as Promise<Configuration>;
  }
}