import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ecole } from './ecole.entity';

import { CreateEcoleDto } from './dto/create-ecole.dto';
import { UpdateEcoleDto } from './dto/update-ecole.dto';

@Injectable()
export class EcolesService {
  constructor(
    @InjectRepository(Ecole, 'central')
    private readonly ecoleRepository: Repository<Ecole>,
  ) {}

  findAll(): Promise<Ecole[]> {
    return this.ecoleRepository.find();
  }

  async findOne(id: number): Promise<Ecole> {
    const ecole = await this.ecoleRepository.findOneBy({ id });
    if (!ecole) {
      throw new NotFoundException(`Ecole with ID ${id} not found`);
    }
    return ecole;
  }

  create(createEcoleDto: CreateEcoleDto): Promise<Ecole> {
    const ecole = this.ecoleRepository.create(createEcoleDto);
    // Ici, vous ajouteriez la logique pour créer la base de données du tenant
    // et exécuter les migrations. C'est une étape avancée.
    return this.ecoleRepository.save(ecole);
  }
  async update(id: number, updateEcoleDto: UpdateEcoleDto): Promise<Ecole> {
    // findOne va lancer une exception NotFoundException si l'école n'est pas trouvée
    const ecole = await this.findOne(id);

    // Vérifier les contraintes d'unicité si le sous-domaine ou le nom de la DB sont modifiés
    if (updateEcoleDto.sous_domaine && updateEcoleDto.sous_domaine !== ecole.sous_domaine) {
      const existing = await this.ecoleRepository.findOne({ where: { sous_domaine: updateEcoleDto.sous_domaine } });
      if (existing) throw new ConflictException('Ce sous-domaine est déjà utilisé.');
    }
    if (updateEcoleDto.db_name && updateEcoleDto.db_name !== ecole.db_name) {
      const existing = await this.ecoleRepository.findOne({ where: { db_name: updateEcoleDto.db_name } });
      if (existing) throw new ConflictException('Ce nom de base de données est déjà utilisé.');
    }

    Object.assign(ecole, updateEcoleDto);
    return this.ecoleRepository.save(ecole);
  }

  async remove(id: number): Promise<void> {
    const result = await this.ecoleRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Ecole with ID ${id} not found`);
    }
  }
}


