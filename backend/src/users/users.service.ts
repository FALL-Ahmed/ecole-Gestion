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
import { CreateUserDto } from './dto/create-user.dto';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ParentService } from '../central/parent.service';
import { CreerParentDto } from '../central/dto/creer-parent.dto';
import * as bcrypt from 'bcrypt';
import { UtilisateurBloc } from './utilisateur-bloc.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Bloc } from '../bloc/bloc.entity';
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

    @InjectRepository(Bloc)
    private readonly blocRepository: Repository<Bloc>,

    private readonly parentService: ParentService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private getBlocId(): number | null {
    const user = this.request.user as any;
    this.logger.debug(`[getBlocId] Tentative de récupération du blocId.`);

    // Priorité 1: Le blocId dans le token (pour admin, prof, élève)
    if (user && user.blocId) {
      this.logger.debug(`[getBlocId] blocId ${user.blocId} trouvé dans le token JWT.`);
      return user.blocId;
    }

    // Priorité 2: Le blocId dans les paramètres de la requête (pour les parents)
    const queryBlocId = this.request.query.blocId;
    if (queryBlocId && !isNaN(parseInt(queryBlocId as string, 10))) {
      const blocId = parseInt(queryBlocId as string, 10);
      this.logger.debug(`[getBlocId] blocId ${blocId} trouvé dans les paramètres de la requête.`);
      return blocId;
    }

    this.logger.debug(`[getBlocId] Aucun blocId trouvé pour l'utilisateur ${user?.email}. Retourne null.`);
    return null;
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
    data: CreateUserDto,
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

    // Gérer l'affectation des blocs si des IDs sont fournis
    if (data.blocIds && data.blocIds.length > 0) {
      await this.synchronizeUserBlocs(savedUser.id, data.blocIds);
    }

    return {
      user: savedUser,
      plainPassword,
      motDePasseParent,
    };
  }

  private async synchronizeUserBlocs(userId: number, blocIds: number[]): Promise<void> {
    // 1. Supprimer les anciens accès
    await this.utilisateurBlocRepository.delete({ utilisateur: { id: userId } });

    // 2. Ajouter les nouveaux accès
    for (const blocId of blocIds) {
      try {
        const blocExists = await this.blocRepository.findOneBy({ id: blocId });
        if (blocExists) {
          const newAccess = this.utilisateurBlocRepository.create({
            utilisateur: { id: userId },
            bloc: { id: blocId },
          });
          await this.utilisateurBlocRepository.save(newAccess);
        } else {
          this.logger.warn(`Bloc avec l'ID ${blocId} introuvable, impossible de créer l'association pour l'utilisateur ${userId}.`);
        }
      } catch (error) {
        // Log l'erreur mais ne bloque pas les autres créations
        this.logger.error(`Impossible de lier l'utilisateur ${userId} au bloc ${blocId}`, error.stack);
      }
    }
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

    // 1. Filtre les utilisateurs qui ont accès au bloc courant.
    // 2. Pour ces utilisateurs, charge TOUTES leurs associations de blocs.
    return await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.accesBlocs', 'access_filter', 'access_filter.blocId = :blocId', { blocId })
      .leftJoinAndSelect('user.accesBlocs', 'all_access')
      .getMany();
  }

  async deleteUser(id: number): Promise<void> {
    // First, find the user to ensure they exist and the current admin has access to them.
    // The `findById` method already contains the logic to filter by the admin's blocId.
    const userToDelete = await this.findById(id);

    // If findById didn't throw an error, it means the user exists and is in the correct bloc.
    // Now we can safely delete them using the more robust `remove` method.
    await this.userRepository.remove(userToDelete);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.findById(id);

    const { ancienMotDePasse, nouveauMotDePasse, blocIds, ...otherFields } = updateUserDto;

    if (ancienMotDePasse || nouveauMotDePasse) {
      throw new BadRequestException("La modification du mot de passe n'est pas gérée ici.");
    }

    Object.assign(user, otherFields);
    await this.userRepository.save(user);

    if (blocIds !== undefined) {
      await this.synchronizeUserBlocs(id, blocIds);
    }

    // Re-fetch the user with all relations to return the updated state to the frontend
    const updatedUserWithRelations = await this.userRepository.findOne({
        where: { id },
        relations: ['accesBlocs']
    });

    if (!updatedUserWithRelations) throw new NotFoundException('Utilisateur non trouvé après la mise à jour.');

    return updatedUserWithRelations;
  }

  async updatePasswordWithoutOld(id: number, hashedPassword: string): Promise<void> {
    const user = await this.findById(id);
    user.motDePasse = hashedPassword;
    await this.userRepository.save(user);
  }
}
