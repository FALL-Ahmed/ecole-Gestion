// src/configuration/configuration.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Configuration } from './configuration.entity';
import { Repository } from 'typeorm';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Injectable()
export class ConfigurationService {
  constructor(
    @InjectRepository(Configuration)
    private readonly configurationRepository: Repository<Configuration>,

    @InjectRepository(anneescolaire)
    private readonly anneeRepository: Repository<anneescolaire>,
  ) {}

  async getConfiguration(): Promise<Configuration> {
       const configs = await this.configurationRepository.find({

      relations: ['annee_scolaire'],
            take: 1,

    });

       if (configs.length === 0) {
      throw new NotFoundException('Configuration not found. Please set it up.');
    }

    return configs[0];
  }

  /**
   * Creates the application configuration for the first time.
   * Throws a ConflictException if a configuration already exists.
   */
  async createConfiguration(anneeScolaireId: number): Promise<Configuration> {
    const existingConfigCount = await this.configurationRepository.count();
    if (existingConfigCount > 0) {
      throw new ConflictException(
        'A configuration already exists. Use PUT to update it.',
      );
    }

    const annee = await this.anneeRepository.findOneBy({ id: anneeScolaireId });
    if (!annee) {
      throw new NotFoundException(
        `Academic year with ID ${anneeScolaireId} not found.`,
      );
    }

    const newConfig = this.configurationRepository.create({
      annee_scolaire: annee,
    });

    return this.configurationRepository.save(newConfig);
  }

  /**
   * Updates the existing application configuration.
   * The `id` parameter refers to the configuration record's ID.
   */
  async updateConfiguration(
    id: number,
    anneeScolaireId: number,
  ): Promise<Configuration> {
    const annee = await this.anneeRepository.findOneBy({ id: anneeScolaireId });
    if (!annee) {
      throw new NotFoundException(
        `Academic year with ID ${anneeScolaireId} not found.`,
      );
    }

    // Using `preload` is a safe way to find an entity by ID and update it.
    const configToUpdate = await this.configurationRepository.preload({
      id: id,
      annee_scolaire: annee,
    });

    if (!configToUpdate) {
      throw new NotFoundException(`Configuration with ID ${id} not found.`);
    }

    return this.configurationRepository.save(configToUpdate);
  }
}
