import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InscriptionService } from './inscription.service';
import { InscriptionController } from './inscription.controller';
import { Inscription } from './inscription.entity';
import { User } from '../users/user.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { Classe } from '../classe/classe.entity';
import { ClasseModule } from '../classe/classe.module'; // 👈 Chemin correct


@Module({
  imports: [
    TypeOrmModule.forFeature([Inscription, User, Classe, anneescolaire]),
    ClasseModule, // <--- Importer les deux ici
  ],
  providers: [InscriptionService],
  controllers: [InscriptionController],
})
export class InscriptionModule {}
