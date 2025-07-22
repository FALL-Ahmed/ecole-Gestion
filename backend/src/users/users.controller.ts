import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Logger,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './user.entity';

@UseGuards(JwtAuthGuard, RolesGuard) // On applique les deux guards à tout le contrôleur
@Controller('api/users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN) // Seuls les admins peuvent créer
  async create(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    const userAgent = req.user as any;
    this.logger.log(`[create] Requête de création d'utilisateur reçue par ${userAgent?.email} (blocId: ${userAgent?.blocId}).`);
    const { user, plainPassword, motDePasseParent } = await this.usersService.createUser(createUserDto);
    
    this.logger.log(`[create] Utilisateur ${user.email} (ID: ${user.id}) créé avec succès.`);
    // Retourner les infos utilisateur + mot de passe en clair
    return {
      ...user,
      plainPassword, // Mot de passe principal (pour tous les utilisateurs)
      parentPassword: motDePasseParent // Mot de passe du parent (si élève)
    };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN) // Seuls les admins peuvent modifier
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const userAgent = req.user as any;
    this.logger.log(`[update] Requête de mise à jour pour l'utilisateur ID: ${id} par ${userAgent?.email} (blocId: ${userAgent?.blocId}).`);
    const updatedUser = await this.usersService.update(id, updateUserDto);
    this.logger.log(`[update] Utilisateur ID: ${id} mis à jour avec succès.`);
    return updatedUser;
  }

  @Get()
  // Pas de @Roles ici, donc tous les utilisateurs authentifiés (admins, profs...) peuvent accéder
  async findAll(@Req() req: Request) {
    const userAgent = req.user as any;
    this.logger.log(`[findAll] Requête reçue par ${userAgent?.email} (blocId: ${userAgent?.blocId}).`);
    const users = await this.usersService.findAll();
    this.logger.log(`[findAll] ${users.length} utilisateurs trouvés pour le blocId: ${userAgent?.blocId}.`);
    return users;
  }

  @Get(':id')
  // Pas de @Roles ici non plus
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userAgent = req.user as any;
    this.logger.log(`[findOne] Requête pour l'ID: ${id} par ${userAgent?.email} (blocId: ${userAgent?.blocId}).`);
    const user = await this.usersService.findById(id);
    this.logger.log(`[findOne] Utilisateur trouvé pour l'ID ${id}: ${user?.email}`);
    return user;
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // Seuls les admins peuvent supprimer
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const userAgent = req.user as any;
    this.logger.log(`[remove] Requête de suppression pour l'ID: ${id} par ${userAgent?.email} (blocId: ${userAgent?.blocId}).`);
    await this.usersService.deleteUser(id);
    this.logger.log(`[remove] Utilisateur avec l'ID: ${id} supprimé avec succès.`);
    return { message: 'Utilisateur supprimé avec succès.' };
  }
}