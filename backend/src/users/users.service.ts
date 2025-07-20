import {
  Injectable,
  NotFoundException,
  Scope,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ParentService } from '../central/parent.service';
import { CreerParentDto } from '../central/dto/creer-parent.dto';
import * as bcrypt from 'bcrypt';
@Injectable({ scope: Scope.REQUEST })
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,

    @InjectRepository(anneescolaire)
    private readonly anneeScolaireRepository: Repository<anneescolaire>,

    private readonly parentService: ParentService,
  ) {}

  private generateRandomPassword(length = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private async genererEmailUniquePourParent(nomTuteur: string): Promise<string> {
    const base = nomTuteur
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.');

    let email = `${base}@parent.com`;
    let compteur = 1;

    while (await this.parentService.findByEmail(email)) {
      email = `${base}${compteur}@parent.com`;
      compteur++;
    }

    return email;
  }

  private normalizeMauritanianPhone(phone: string): string {
    const clean = phone.trim().replace(/\s+/g, '');
    if (clean.startsWith('+222')) return clean;
    if (clean.startsWith('00')) {
      if (clean.startsWith('00222')) return '+' + clean.slice(2);
      throw new BadRequestException("Seuls les numéros mauritaniens (+222) sont autorisés.");
    }
    if (clean.startsWith('0')) return '+222' + clean.slice(1);
    return '+222' + clean;
  }

  async createUser(
    data: Partial<User> & { parentEmail?: string },
  ): Promise<{
    user: Partial<User>;
    plainPassword: string;
    motDePasseParent: string | null;
  }> {
    let parentId: string | null = null;
    let motDePasseParent: string | null = null;

    const plainPassword = this.generateRandomPassword(12);

    // 👉 Normaliser téléphone tuteur s'il est présent
    if (data.tuteurTelephone) {
      data.tuteurTelephone = this.normalizeMauritanianPhone(data.tuteurTelephone);
    }

    if (
      data.role === UserRole.ETUDIANT &&
      (data.tuteurNom || data.tuteurTelephone || data.parentEmail)
    ) {
      const existingParent = await this.parentService.findByTuteurInfo(
        data.tuteurNom,
        data.tuteurTelephone,
        data.parentEmail,
      );

      if (existingParent) {
        parentId = existingParent.id;

        if (data.tuteurNom && data.tuteurNom !== existingParent.nom) {
          await this.parentService.update(existingParent.id, {
            nom: data.tuteurNom,
            telephone: data.tuteurTelephone || existingParent.telephone,
            email: data.parentEmail || existingParent.email,
          });
        }
      } else {
        motDePasseParent = this.generateRandomPassword(12);

        let email = data.parentEmail;
        if (!email || (await this.parentService.findByEmail(email))) {
          email = await this.genererEmailUniquePourParent(data.tuteurNom!);
        }

        const parentDto: CreerParentDto = {
          nom: data.tuteurNom!,
          telephone: data.tuteurTelephone!,
          email,
          mot_de_passe: motDePasseParent,
          adresse: data.adresse || '',
        };

        const newParent = await this.parentService.create(parentDto);
        parentId = newParent.id;
      }
    }

    const newUser = this.userRepository.create({
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      role: data.role ?? UserRole.ETUDIANT,
      genre: data.genre ?? null,
      adresse: data.adresse ?? null,
      photoUrl: data.photoUrl ?? null,
      tuteurNom: data.tuteurNom ?? null,
      tuteurTelephone: data.tuteurTelephone ?? null,
      actif: data.actif ?? true,
      parentId: parentId ?? null,
      motDePasse: await bcrypt.hash(plainPassword, 10),
    });

    const savedUser = await this.userRepository.save(newUser);

    return {
      user: savedUser,
      plainPassword,
      motDePasseParent,
    };
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

    async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.motDePasse')
      .where('user.email = :email', { email })
      .getOne();
  }


  async findAll(): Promise<Partial<User>[]> {
    return this.userRepository.find();
  }

  async deleteUser(id: number): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Utilisateur non trouvé pour suppression');
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.findById(id);

    const { ancienMotDePasse, nouveauMotDePasse, ...otherFields } = updateUserDto;

    if (ancienMotDePasse || nouveauMotDePasse) {
      throw new BadRequestException("La modification du mot de passe n'est pas gérée ici.");
    }

    Object.assign(user, otherFields);
    return this.userRepository.save(user);
  }

  async updatePasswordWithoutOld(id: number, hashedPassword: string): Promise<void> {
    const user = await this.findById(id);
    user.motDePasse = hashedPassword;
    await this.userRepository.save(user);
  }
}
