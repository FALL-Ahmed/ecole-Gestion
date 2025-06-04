import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';  // ← importe le contrôleur
import { User } from './user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { Classe } from '../classe/classe.entity';


@Module({
  imports: [TypeOrmModule.forFeature([User, Classe, anneescolaire])],
  providers: [UsersService],
  controllers: [UsersController],   // ← ajoute ici le contrôleur
  exports: [UsersService],
})
export class UsersModule {}
