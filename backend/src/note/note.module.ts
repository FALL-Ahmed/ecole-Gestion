// Dans votre fichier src/note/note.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';
import { Note } from './note.entity';
import { Evaluation } from '../evaluation/evaluation.entity'; // Assurez-vous que le chemin est correct
import { User } from '../users/user.entity'; // Ou Utilisateur, assurez-vous que le chemin et le nom sont corrects

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Note,
      Evaluation, // <-- Ajoutez l'entité Evaluation ici
      User,       // <-- Ajoutez l'entité User (ou Utilisateur) ici
    ]),
    // Si Evaluation ou User sont dans des modules séparés qui exportent leur TypeOrmModule.forFeature,
    // vous importeriez ces modules ici à la place.
    // Par exemple: EvaluationModule, UserModule
  ],
  controllers: [NoteController],
  providers: [NoteService],
})
export class NoteModule {}
