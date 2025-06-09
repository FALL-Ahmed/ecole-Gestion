// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { Classe } from '../classe/classe.entity'; 
import { anneescolaire } from '../annee-academique/annee-academique.entity'; 

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,

    @InjectRepository(anneescolaire)
    private readonly anneeScolaireRepository: Repository<anneescolaire>,
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
    // const hashedPassword = await bcrypt.hash(passwordToUse, 10); // Uncomment when ready to hash passwords

    const newUser = this.userRepository.create({
      nom: data.nom,
      prenom: data.prenom,
      email: data.email?.trim().toLowerCase(),
      motDePasse: passwordToUse, // mot de passe en clair (pas sécurisé, à changer !)
      role: data.role ?? UserRole.ETUDIANT,
      genre: data.genre ?? null,
      adresse: data.adresse ?? null,
      photoUrl: data.photoUrl ?? null,
      tuteurNom: data.tuteurNom ?? null,
      tuteurTelephone: data.tuteurTelephone ?? null,
      actif: data.actif ?? true,
    });

    const savedUser = await this.userRepository.save(newUser);

    return {
      user: savedUser,
      motDePasse: passwordToUse, // Attention: ne retournez pas le mot de passe en clair en production
    };
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  // This method is already present and correct!
  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async deleteUser(id: number): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Utilisateur non trouvé pour suppression');
    }
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const user = await this.findById(id); // Use findById to ensure the user exists
    if (data.motDePasse) {
      data.motDePasse = await bcrypt.hash(data.motDePasse, 10);
    }

    // Object.assign updates the existing user object with new data
    Object.assign(user, data); 
    return this.userRepository.save(user);
  }
}