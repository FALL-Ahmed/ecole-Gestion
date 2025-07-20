import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ParentService } from '../central/parent.service';
import { User } from '../users/user.entity';
import { Parent } from '../central/parent.entity';
import { AdminService } from 'src/admin/admin.service';
import { Admin } from 'src/admin/admin.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly parentService: ParentService,
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
  ) {}

 async validateUser(email: string, password: string): Promise<any> {
  // D'abord chercher dans Admin (base centrale)
  const adminWithPassword = await this.adminService.findByEmailWithPassword(email);
  if (adminWithPassword) {
    return this.validateAdminCredentials(adminWithPassword, password);
  }

  // D'abord chercher dans Parent (base centrale)
  // NOTE: You must create a `findByEmailWithPassword` method in `ParentService`
  // similar to the one we created for `AdminService`.
  const parentWithPassword = await this.parentService.findByEmailWithPassword(email);
  if (parentWithPassword) {
    return this.validateParentCredentials(parentWithPassword, password);
  }

  // Si pas trouvé, chercher dans User (base par défaut)
  // NOTE: You must create a `findByEmailWithPassword` method in `UsersService`
  // that selects the `motDePasse` field.
  const userWithPassword = await this.usersService.findByEmailWithPassword(email);
  if (userWithPassword) {
    return this.validateUserCredentials(userWithPassword, password);
  }

  throw new UnauthorizedException('Identifiants incorrects');
}

  private async validateUserCredentials(user: User, password: string): Promise<Partial<User>> {
    const isPasswordValid = await this.verifyPassword(user.motDePasse, password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    if (!user.actif) {
      throw new UnauthorizedException('Compte désactivé');
    }

    // Ne pas retourner le mot de passe
    const { motDePasse, ...result } = user;
    return result;
  }

  private async validateParentCredentials(parent: Parent, password: string): Promise<Partial<Parent>> {
    const isPasswordValid = await this.verifyPassword(parent.mot_de_passe, password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    if (!parent.actif) {
      throw new UnauthorizedException('Compte parent désactivé');
    }

    // Ne pas retourner le mot de passe
    const { mot_de_passe, ...result } = parent;
    return {
      ...result,
      role: 'parent' // Ajout explicite du rôle
    };
  }

  private async validateAdminCredentials(admin: Admin, password: string): Promise<Partial<Admin>> {
    const isPasswordValid = await this.verifyPassword(admin.mot_de_passe, password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    const { mot_de_passe, ...result } = admin;
    return result;
  }

  private async verifyPassword(hashedPassword: string | undefined, plainPassword: string): Promise<boolean> {
  // Vérifier si le mot de passe existe
  if (!hashedPassword) {
    throw new UnauthorizedException('Aucun mot de passe défini pour ce compte');
  }

  // Vérifie si le mot de passe est déjà haché
  const isHashed = hashedPassword.startsWith('$2a$') || 
                  hashedPassword.startsWith('$2b$') || 
                  hashedPassword.startsWith('$2y$');

  if (isHashed) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Pour la compatibilité avec les anciens mots de passe non hachés
  return plainPassword === hashedPassword;
}

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role || 'USER', // Valeur par défaut si le rôle n'est pas défini
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nom: user.nom, // Compatibilité User/Parent
      },
    };
  }
}