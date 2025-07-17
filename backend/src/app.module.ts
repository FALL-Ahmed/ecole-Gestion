import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
import { EmploiDuTempsModule } from './emploidutemps/emploidutemps.module';
import { ExceptionEmploiDuTempsModule } from './exceptionemploidutemps/exceptionemploidutemps.module';
import { AbsenceModule } from './absence/absence.module';
import { ChapitreModule } from './chapitre/chapitre.module';
import { EtablissementInfoModule } from './etablissement/etablissement-info.module';
import { AuditLogModule } from './historique/historique.module';
import { PaiementsModule } from './paiements/paiements.module'; // 1. Importer le module des paiements
import { ProfessorAbsencesModule } from './professor-absence/professor-absence.module'; // 1. Importer le module des paiements
import { DisciplinaryRecordsModule } from './disciplinary-records/disciplinary-records.module';
import { WhatsAppModule } from './twilo/whatsapp.module';
import { RappelPaiementModule } from './paiements/rappel-paiement.module';


import { AuditSubscriber } from './subscribers/audit.subscriber'; // 🔥 Ajout ici

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: false,
        ssl: configService.get<string>('DB_HOST')?.includes('railway')
          ? { rejectUnauthorized: false }
          : false,
        subscribers: [AuditSubscriber], // ✅ Déclaration du subscriber ici aussi
      }),
    }),

    // Modules fonctionnels
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
    ConfigurationModule,
    EmploiDuTempsModule,
    ExceptionEmploiDuTempsModule,
    AbsenceModule,
    ChapitreModule,
    EtablissementInfoModule,
    AuditLogModule,
   PaiementsModule,
    ProfessorAbsencesModule,
    DisciplinaryRecordsModule,
    WhatsAppModule,
    RappelPaiementModule,
 


    
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AuditSubscriber, // ✅ Pour que Nest puisse injecter correctement
  ],
})
export class AppModule {}
