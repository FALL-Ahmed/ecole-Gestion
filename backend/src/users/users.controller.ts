import { Controller, Get, Post, Body, Put, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';


@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Post()
async createUser(@Body() data: CreateUserDto): Promise<{ user: User; motDePasse: string }> {
  console.log('Payload reçu :', data);
  const userData = {
    ...data,
    genre: data.genre !== undefined ? (data.genre as any) : undefined,
    dateInscription: data.dateInscription ? data.dateInscription.toISOString() : undefined,
  };

  // Retourne l'utilisateur + mot de passe généré
  return this.usersService.createUser(userData);
}
 @Put(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() data: Partial<User>
  ): Promise<User> {
    return this.usersService.updateUser(Number(id), data);
  }
}
