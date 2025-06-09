import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClasseModule } from './classe/classe.module';
import { AnneeAcademiqueModule } from './annee-academique/annee-academique.module';
import { InscriptionModule } from './inscription/inscription.module';
import { MatiereModule } from './matieres/matiere.module';
import { AffectationModule } from './affectation/affectation.module';
import { CoefficientClasseModule } from './coeff/coeff.module';
import { TrimestreModule } from './trimestre/trimestre.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { NoteModule } from './note/note.module';
import { ConfigurationModule } from './configuration/configuration.module';



@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '', // ← ton mot de passe MySQL ici
      database: 'school_management', // ← nom de ta base de données
      autoLoadEntities: true,
      synchronize: false, // ← ne pas toucher aux tables existantes
    }),

    AuthModule,
    UsersModule,
    ClasseModule,
    AnneeAcademiqueModule,
    InscriptionModule,
    MatiereModule,
    AffectationModule, 
    CoefficientClasseModule,
    TrimestreModule,
    EvaluationModule,
    NoteModule,
    ConfigurationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
