import {
  Injectable,
  NotFoundException,
  Scope,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  Inject,
  Logger,
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
import { UtilisateurBloc } from './utilisateur-bloc.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
@Injectable({ scope: Scope.REQUEST })
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(UtilisateurBloc)
    private readonly utilisateurBlocRepository: Repository<UtilisateurBloc>,

    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,

    @InjectRepository(anneescolaire)
    private readonly anneeScolaireRepository: Repository<anneescolaire>,

    private readonly parentService: ParentService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private getBlocId(): number | null {
    const user = this.request.user as any;
    this.logger.debug(`[getBlocId] Tentative de récupération du blocId depuis request.user.`);
    if (!user || !user.blocId) {
      this.logger.debug(`[getBlocId] Aucun utilisateur ou blocId trouvé sur request.user. request.user est: ${JSON.stringify(user)}`);
      return null; // Ne pas lancer d'erreur, certains contextes peuvent ne pas avoir de blocId
    }
    this.logger.debug(`[getBlocId] blocId trouvé: ${user.blocId}`);
    return user.blocId;
  }

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
    const phoneNumber = parsePhoneNumberFromString(phone, 'MR');

    if (!phoneNumber || !phoneNumber.isValid()) {
      throw new BadRequestException(`Le numéro de téléphone '${phone}' n'est pas valide.`);
    }

    if (phoneNumber.country !== 'MR') {
      throw new BadRequestException("Seuls les numéros mauritaniens sont autorisés.");
    }

    return phoneNumber.format('E.164'); // Retourne le format international, ex: +22222123456
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

    // **NOUVELLE LOGIQUE : Lier l'utilisateur au bloc actuel**
    // Ne s'applique pas aux étudiants, car leur lien se fait à l'inscription.
    const blocId = this.getBlocId();
    if (blocId && savedUser.role !== UserRole.ETUDIANT) {
      const newAccess = this.utilisateurBlocRepository.create({
        utilisateur: { id: savedUser.id },
        bloc: { id: blocId },
      });
      try {
        await this.utilisateurBlocRepository.save(newAccess);
      } catch (error) {
        // Log l'erreur mais ne bloque pas la création de l'utilisateur
        console.error(`Impossible de lier l'utilisateur ${savedUser.id} au bloc ${blocId}`, error);
      }
    }

    return {
      user: savedUser,
      plainPassword,
      motDePasseParent,
    };
  }

 async findById(id: number): Promise<User> {
  const blocId = this.getBlocId();
  
  const query = this.userRepository
    .createQueryBuilder('user')
    .where('user.id = :id', { id });

  if (blocId) {
    query.innerJoin('user.accesBlocs', 'acces', 'acces.blocId = :blocId', { blocId });
  }

  const user = await query.getOne();
  
  if (!user) {
    throw new NotFoundException('Utilisateur non trouvé');
  }
  return user;
}

  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug(`[findByEmail] Recherche simple pour l'email: ${email}`);
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    this.logger.log(`[findByEmailWithPassword] Recherche de l'utilisateur avec l'email: ${email}`);
    const blocId = this.getBlocId();
    this.logger.debug(`[findByEmailWithPassword] Contexte de blocId obtenu: ${blocId}`);

    const query = this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.motDePasse')
      .leftJoinAndSelect('user.accesBlocs', 'accesBlocs')
      .leftJoinAndSelect('accesBlocs.bloc', 'bloc')
      .where('user.email = :email', { email });

    if (blocId) {
      this.logger.debug(`[findByEmailWithPassword] Ajout du filtre pour le blocId: ${blocId}`);
      query.andWhere('accesBlocs.blocId = :blocId', { blocId });
    } else {
      this.logger.debug(`[findByEmailWithPassword] Aucun filtre de blocId appliqué (ce qui est normal pendant la validation du jeton).`);
    }
    const user = await query.getOne();
    if (user) {
      this.logger.log(`[findByEmailWithPassword] Utilisateur trouvé pour l'email ${email}.`);
    } else {
      this.logger.warn(`[findByEmailWithPassword] Aucun utilisateur trouvé pour l'email ${email}.`);
    }
    return user;
}

  async findAll(): Promise<Partial<User>[]> {
    const blocId = this.getBlocId();
    if (!blocId) {
      // Si aucun bloc n'est sélectionné (ex: superadmin), on ne peut pas filtrer.
      // Pour la sécurité, retournons une liste vide.
      console.warn("[UsersService.findAll] Aucun blocId trouvé, retour d'une liste vide.");
      return [];
    }

    // Trouve tous les utilisateurs qui ont accès au bloc actuel.
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.accesBlocs', 'acces')
      .where('acces.blocId = :blocId', { blocId })
      .getMany();
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
