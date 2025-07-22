// Dans votre fichier src/note/note.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';
import { Note } from './note.entity';
import { Evaluation } from '../evaluation/evaluation.entity'; // Assurez-vous que le chemin est correct
import { User } from '../users/user.entity'; // Ou Utilisateur, assurez-vous que le chemin et le nom sont corrects
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [
    NoteService,
    createTenantRepositoryProvider(Note),
    createTenantRepositoryProvider(Evaluation),
    createTenantRepositoryProvider(User),
  ],

  controllers: [NoteController],
})
export class NoteModule {}
