import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { UpdateUserDto } from './dto/update-user.dto'; // à adapter selon ta structure

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
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }
    return password;
  }

  async createUser(
    data: Partial<User>,
  ): Promise<{ user: Partial<User>; motDePasse: string }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email?.trim().toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }

    const plainPassword = data.motDePasse ?? this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newUser = this.userRepository.create({
      nom: data.nom,
      prenom: data.prenom,
      email: data.email?.trim().toLowerCase(),
      motDePasse: hashedPassword,
      role: data.role ?? UserRole.ETUDIANT,
      genre: data.genre ?? null,
      adresse: data.adresse ?? null,
      photoUrl: data.photoUrl ?? null,
      tuteurNom: data.tuteurNom ?? null,
      tuteurTelephone: data.tuteurTelephone ?? null,
      actif: data.actif ?? true,
    });

    const savedUser = await this.userRepository.save(newUser);
    const { motDePasse, ...userWithoutPassword } = savedUser;

    return {
      user: userWithoutPassword,
      motDePasse: plainPassword,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return user;
  }

  async findAll(): Promise<Partial<User>[]> {
    const users = await this.userRepository.find();
    return users.map(({ motDePasse, ...user }) => user);
  }

  async deleteUser(id: number): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Utilisateur non trouvé pour suppression');
    }
  }
  
  async updatePasswordWithoutOld(userId: number, newHashedPassword: string): Promise<void> {
  const user = await this.findById(userId);
  user.motDePasse = newHashedPassword;
  await this.userRepository.save(user);
}


  async update(id: number, updateUserDto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.findById(id);

    // Gestion changement mot de passe
    if (updateUserDto.nouveauMotDePasse) {
      if (!updateUserDto.ancienMotDePasse) {
        throw new BadRequestException(
          "L'ancien mot de passe est requis pour définir un nouveau mot de passe.",
        );
      }
      await this.changePassword(
        id,
        updateUserDto.ancienMotDePasse,
        updateUserDto.nouveauMotDePasse,
      );
    }

    // On ne garde pas les champs de mot de passe pour la mise à jour générale
    const { ancienMotDePasse, nouveauMotDePasse, ...otherProfileUpdates } =
      updateUserDto;

    if (Object.keys(otherProfileUpdates).length > 0) {
      Object.assign(user, otherProfileUpdates);
      await this.userRepository.save(user);
    }

    const { motDePasse, ...result } = user;
    return result;
  }

  private async changePassword(
    userId: number,
    ancienMotDePasse: string,
    nouveauMotDePasse: string,
  ): Promise<void> {
    const user = await this.findById(userId);

    const isPasswordMatching = await bcrypt.compare(
      ancienMotDePasse,
      user.motDePasse,
    );
    if (!isPasswordMatching) {
      throw new UnauthorizedException("L'ancien mot de passe est incorrect.");
    }

    const hashedPassword = await bcrypt.hash(nouveauMotDePasse, 10);

    await this.userRepository.update(userId, { motDePasse: hashedPassword });
  }
}
