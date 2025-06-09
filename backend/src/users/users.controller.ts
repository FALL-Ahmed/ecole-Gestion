import { Controller, Get, Post, Body, Put, Param, NotFoundException } from '@nestjs/common';
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

  // --- CORRECTION HERE: Calling usersService.findById ---
  @Get(':id') // This decorator tells NestJS to handle GET requests to /api/users/:id
  async getUserById(@Param('id') id: number): Promise<User> {
    // Call the findById method from your UsersService
    // Your findById in service already throws NotFoundException if user is not found.
    // So, no need for an explicit `if (!user)` check here.
    return this.usersService.findById(id); 
  }
  // ---------------------------------------------------------------

  @Post()
  async createUser(@Body() data: CreateUserDto): Promise<{ user: User; motDePasse: string }> {
    console.log('Payload reçu :', data);
    const userData = {
      ...data,
      genre: data.genre !== undefined ? (data.genre as any) : undefined,
      // Ensure dateInscription is handled correctly if it's part of CreateUserDto
      // For example, if it's a string from the frontend, you might need to parse it
      // dateInscription: data.dateInscription ? new Date(data.dateInscription) : undefined,
    };

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