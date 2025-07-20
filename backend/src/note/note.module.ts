// Dans votre fichier src/note/note.module.ts

import { Module } from '@nestjs/common';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';
import { Note } from './note.entity';
import { Evaluation } from '../evaluation/evaluation.entity'; // Assurez-vous que le chemin est correct
import { User } from '../users/user.entity'; // Ou Utilisateur, assurez-vous que le chemin et le nom sont corrects
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
  imports: [],
  providers: [
    NoteService,
    createTenantRepositoryProvider(Note),
    createTenantRepositoryProvider(Evaluation),
    createTenantRepositoryProvider(User),
  ],

  controllers: [NoteController],
})
export class NoteModule {}
