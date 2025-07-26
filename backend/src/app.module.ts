import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { PaiementsModule } from './paiements/paiements.module';
import { ProfessorAbsencesModule } from './professor-absence/professor-absence.module';
import { DisciplinaryRecordsModule } from './disciplinary-records/disciplinary-records.module';
import { WhatsAppModule } from './twilo/whatsapp.module';
import { RappelPaiementModule } from './paiements/rappel-paiement.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Bloc } from './bloc/bloc.entity';
import { EmploiDuTemps } from './emploidutemps/emploidutemps.entity';
import { UtilisateurBloc } from './users/utilisateur-bloc.entity';

import { TenantModule } from './tenant/tenant.module';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { Parent } from './central/parent.entity';
import { User } from './users/user.entity';
import { Absence } from './absence/absence.entity';
import { Matiere } from './matieres/matiere.entity';
import { Chapitre } from './chapitre/chapitre.entity';
import { Classe } from './classe/classe.entity';
import { Inscription } from './inscription/inscription.entity';
import { anneescolaire } from './annee-academique/annee-academique.entity';
import { Evaluation } from './evaluation/evaluation.entity';
import { Trimestre } from './trimestre/trimestre.entity';
import { Note } from './note/note.entity';
import { AdminModule } from './admin/admin.module';
import { EcolesModule } from './ecoles/ecoles.module';
import { Ecole } from './ecoles/ecole.entity';
import { Admin } from './admin/admin.entity';
import { ParentModule } from './central/parent.module';
import { BlocModule } from './bloc/bloc.module';
import { ParentSearchModule } from './parent-search/parent-search.module';

import { ExceptionEmploiDuTemps } from './exceptionemploidutemps/exceptionemploidutemps.entity';
import { Paiement } from './paiements/paiements.entity';

const featureModules = [
  AuthModule,
  ParentModule, // Ajouté pour résoudre les dépendances circulaires
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
  AdminModule,
  EcolesModule,
  BlocModule,
  ParentSearchModule,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // First initialize the central database connection
    TypeOrmModule.forRootAsync({
      name: 'central',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('CENTRAL_DB_HOST'),
        port: config.get('CENTRAL_DB_PORT'),
        username: config.get('CENTRAL_DB_USER'),
        password: config.get('CENTRAL_DB_PASSWORD'),
        database: config.get('CENTRAL_DB_NAME'),
        entities: [Parent, Ecole, Admin], // Seules les entités de la base de données centrale sont listées ici.

        synchronize: false,
        logging: false,
        // Configuration du pool de connexions pour la base de données centrale
        extra: {
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        },
      }),
    }),
    // Then initialize the TenantModule
    TenantModule.forRoot(),
    // The tenant database connection is now managed dynamically by TenantConnectionManager
    // and is no longer initialized here.
    ...featureModules,
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}