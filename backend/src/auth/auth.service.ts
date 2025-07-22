import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Scope,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ParentService } from '../central/parent.service';
import { User } from '../users/user.entity';
import { Parent } from '../central/parent.entity';
import { AdminService } from 'src/admin/admin.service';
import { Admin } from 'src/admin/admin.entity';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

// Define response interfaces for clarity
export interface ISelectionRequiredResponse {
  status: 'selection_required';
  preselectionToken: string;
  blocs: { id: number; nom: string }[];
}

export interface ILoginSuccessResponse {
  access_token: string;
  user: Partial<User | Parent | Admin>;
}

@Injectable({ scope: Scope.REQUEST })
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly parentService: ParentService,
    private readonly adminService: AdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<ILoginSuccessResponse | ISelectionRequiredResponse> {
    const { email, password } = loginDto;

    // 1. Check for Admin
    const admin = await this.adminService.findByEmailWithPassword(email);
    if (admin) {
      const isPasswordValid = await this.verifyPassword(admin.mot_de_passe, password);
      if (isPasswordValid) {
        return this.generateFinalToken(admin);
      }
    }

    // 2. Check for Parent
    const parent = await this.parentService.findByEmailWithPassword(email);
    if (parent) {
      const isPasswordValid = await this.verifyPassword(parent.mot_de_passe, password);
      if (isPasswordValid) {
        if (!parent.actif) throw new UnauthorizedException('Compte parent désactivé');
        return this.generateFinalToken(parent);
      }
    }

    // 3. Check for User (with multi-bloc logic)
    const user = await this.usersService.findByEmailWithPassword(email);
    if (user) {
      const isPasswordValid = await this.verifyPassword(user.motDePasse, password);
      if (isPasswordValid) {
        if (!user.actif) throw new UnauthorizedException('Compte désactivé');

        // --- Multi-Bloc Logic Starts Here ---
        const { accesBlocs } = user;

        // Cas C: Aucun bloc trouvé
        if (!accesBlocs || accesBlocs.length === 0) {
          throw new ForbiddenException(
            "Aucun établissement n'est associé à ce compte. Veuillez contacter l'administration.",
          );
        }

        // Cas A: Un seul bloc trouvé
        if (accesBlocs.length === 1) {
          const bloc = accesBlocs[0].bloc;
          if (!bloc) {
            throw new ForbiddenException(
              "Erreur de configuration: L'accès au bloc est défini mais le bloc est manquant.",
            );
          }
          return this.generateFinalToken(user, bloc.id);
        }

        // Cas B: Plusieurs blocs trouvés
        const preselectionToken = this.generatePreselectionToken(user);
        const blocList = accesBlocs.map((access) => ({
          id: access.bloc.id,
          nom: access.bloc.nom,
        }));

        return {
          status: 'selection_required',
          preselectionToken,
          blocs: blocList,
        };
      }
    }

    // If no user of any type is found or password doesn't match
    throw new UnauthorizedException('Email ou mot de passe incorrect');
  }

  async selectBlocAndLogin(
    userId: number,
    blocId: number,
  ): Promise<ILoginSuccessResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Utilisateur non trouvé.');

    // Re-fetch with relations to be absolutely sure about access rights
    const userWithAccess = await this.usersService.findByEmailWithPassword(user.email);
    if (!userWithAccess) throw new UnauthorizedException();

    const hasAccess = userWithAccess.accesBlocs.some(
      (access) => access.bloc.id === blocId,
    );

    if (!hasAccess) {
      throw new ForbiddenException("Accès non autorisé à cet établissement.");
    }

    return this.generateFinalToken(userWithAccess, blocId);
  }

  private async verifyPassword(hashedPassword: string | undefined, plainPassword: string): Promise<boolean> {
    if (!hashedPassword) return false; // Don't throw, just return false to avoid revealing user existence
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private generatePreselectionToken(user: User): string {
    const payload = { sub: user.id };
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_PRESELECTION_SECRET'),
      expiresIn: '5m', // Courte durée de vie
    });
  }

  private generateFinalToken(user: User | Parent | Admin, blocId?: number): ILoginSuccessResponse {
    // Le payload pour le JWT reste le même
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      blocId: blocId, // Will be undefined for Admin/Parent, which is fine
    };

    // Crée un objet utilisateur propre à renvoyer au frontend, en supprimant les données sensibles.
    // Cette approche est type-safe et gère correctement chaque type d'utilisateur de l'union.
    let userPayload: Partial<User | Parent | Admin>;

    if ('motDePasse' in user) { // C'est un utilisateur standard (User)
      const { motDePasse, accesBlocs, ...payload } = user;
      userPayload = payload;
    } else { // C'est un Parent ou un Admin
      const { mot_de_passe, ...payload } = user;
      userPayload = payload;
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: userPayload,
    };
  }
}