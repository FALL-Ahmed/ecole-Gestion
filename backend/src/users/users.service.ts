import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { Classe } from '../classe/classe.entity';  // adapte le chemin selon ton projet
import { anneescolaire } from '../annee-academique/annee-academique.entity';  // adapte chemin

@Injectable()
export class UsersService {
  constructor(
  @InjectRepository(User)
  private readonly userRepository: Repository<User>,

  @InjectRepository(Classe)
  private readonly classeRepository: Repository<Classe>,  // ici

  @InjectRepository(anneescolaire)
  private readonly anneeScolaireRepository: Repository<anneescolaire>, // ici aussi
) {}



  private generateRandomPassword(length = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }
    return password;
  }

  async createUser(data: Partial<User>): Promise<{ user: User; motDePasse: string }> {
    const passwordToUse = data.motDePasse ?? this.generateRandomPassword(8);
    // const hashedPassword = await bcrypt.hash(passwordToUse, 10);

    const newUser = this.userRepository.create({
      nom: data.nom,
      prenom: data.prenom,
      email: data.email?.trim().toLowerCase(),
      motDePasse: passwordToUse, // mot de passe en clair (pas sécurisé)
      role: data.role ?? UserRole.ETUDIANT,
      genre: data.genre ?? null,
      adresse: data.adresse ?? null,
      photoUrl: data.photoUrl ?? null,
      tuteurNom: data.tuteurNom ?? null,
      tuteurTelephone: data.tuteurTelephone ?? null,
      actif: data.actif ?? true,
    });

    const savedUser = await this.userRepository.save(newUser);

    // On retourne aussi le mot de passe en clair (attention : uniquement à la création)
    return {
      user: savedUser,
      motDePasse: passwordToUse,
    };
  }


  // ... les autres méthodes restent inchangées


  // Trouver un utilisateur par email
  async findByEmail(email: string) {
  return this.userRepository.findOne({ where: { email } });
}


  // Trouver un utilisateur par ID
  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return user;
  }

  // Retourner tous les utilisateurs
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  // Supprimer un utilisateur par ID
  async deleteUser(id: number): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Utilisateur non trouvé pour suppression');
    }
  }

  // Mettre à jour un utilisateur
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (data.motDePasse) {
      data.motDePasse = await bcrypt.hash(data.motDePasse, 10);
    }

    Object.assign(user, data);
    return this.userRepository.save(user);
  }
}
