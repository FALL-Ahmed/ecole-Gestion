import { Injectable, ConflictException, NotFoundException, Scope, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parent } from './parent.entity';
import * as bcrypt from 'bcrypt';
import { CreerParentDto } from './dto/creer-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
@Injectable({ scope: Scope.REQUEST })
export class ParentService {
  private readonly INDICATIF = '+222';

  constructor(
    @InjectRepository(Parent, 'central')
    private readonly parentRepository: Repository<Parent>,
  ) {}

  private formatTelephone(numero: string): string {
    return `${this.INDICATIF}${numero}`;
  }

  async create(dto: CreerParentDto): Promise<Parent> {
    const telephoneComplet = this.formatTelephone(dto.telephone);

    const exists = await this.parentRepository.findOne({ 
      where: [{ telephone: telephoneComplet }, { email: dto.email }] 
    });

    if (exists) {
      throw new ConflictException('Un parent avec ce téléphone ou email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(dto.mot_de_passe, 10);

    const parent = this.parentRepository.create({
      ...dto,
      telephone: telephoneComplet,
      mot_de_passe: hashedPassword,
    });

    return this.parentRepository.save(parent);
  }

async getBasicInfo(id: string): Promise<{ nom: string; email: string; telephone: string }> {
  const parent = await this.findOne(id);
  return {
    nom: parent.nom,
    email: parent.email,
    telephone: parent.telephone
  };
}

async exists(id: string): Promise<boolean> {
  return this.parentRepository.exist({ where: { id } });
}

async findByTuteurInfo(
  nom?: string | null,
  telephone?: string | null,
  email?: string | null
): Promise<Parent | null> {
  if (!nom && !telephone && !email) {
    return null;
  }

  const query = this.parentRepository.createQueryBuilder('parent');

  if (nom) {
    // Recherche insensible à la casse et qui ignore les accents
    query.where('LOWER(TRIM(parent.nom)) = LOWER(TRIM(:nom))', { 
      nom: nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    });
  }

  if (telephone) {
    // Nettoyer le numéro de téléphone (garder les 8 derniers chiffres)
    const cleanedPhone = telephone.replace(/\D/g, '').slice(-8);
    query.andWhere('parent.telephone LIKE :telephone', {
      telephone: `%${cleanedPhone}`
    });
  }

  if (email) {
    // Recherche insensible à la casse pour l'email aussi
    query.orWhere('LOWER(TRIM(parent.email)) = LOWER(TRIM(:email))', { 
      email: email.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    });
  }

  return query.getOne();
}

  async findAll(): Promise<Parent[]> {
  return this.parentRepository.find();
}

async searchParents(query: string, limit: number): Promise<Parent[]> {
  return this.parentRepository
    .createQueryBuilder('parent')
    .where('parent.nom LIKE :query', { query: `%${query}%` })
    .orWhere('parent.email LIKE :query', { query: `%${query}%` })
    .orWhere('parent.telephone LIKE :query', { query: `%${query}%` })
    .take(limit)
    .getMany();
}

async findByEmail(email: string): Promise<Parent | null> {
      return this.parentRepository.findOne({ where: { email } });
  }

async findByEmailWithPassword(email: string): Promise<Parent | null> {
    
  return this.parentRepository
    .createQueryBuilder('parent')
    .addSelect('parent.mot_de_passe') // Inclure explicitement le mot de passe
    .where('parent.email = :email', { email })
    .getOne();
}

async findOne(id: string): Promise<Parent> {
  const parent = await this.parentRepository.findOne({ where: { id } });
  if (!parent) {
    throw new NotFoundException('Parent non trouvé');
  }
  return parent;
}
  async update(id: string, dto: UpdateParentDto): Promise<Parent> {
    const parent = await this.findOne(id);
    
    if (dto.telephone) {
      dto.telephone = this.formatTelephone(dto.telephone);
    }

    if (dto.mot_de_passe) {
      dto.mot_de_passe = await bcrypt.hash(dto.mot_de_passe, 10);
    }

    Object.assign(parent, dto);
    return this.parentRepository.save(parent);
  }

  async remove(id: string): Promise<void> {
    await this.parentRepository.delete(id);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    // On récupère le parent avec son mot de passe pour la comparaison
    const parent = await this.parentRepository
      .createQueryBuilder('parent')
      .addSelect('parent.mot_de_passe')
      .where('parent.id = :id', { id })
      .getOne();

    if (!parent) {
      throw new NotFoundException('Parent non trouvé');
    }

    // AJOUT : Vérifier que le mot de passe existe avant de le comparer
    if (!parent.mot_de_passe) {
      throw new UnauthorizedException('Aucun mot de passe n\'est défini pour ce compte. Veuillez contacter l\'administration.');
    }

    const isPasswordMatching = await bcrypt.compare(currentPassword, parent.mot_de_passe);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('L\'ancien mot de passe est incorrect.');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    // Remplacer .update() par .save() pour plus de robustesse avec l'entité chargée.
    parent.mot_de_passe = hashedNewPassword;
    await this.parentRepository.save(parent);
  }
}
