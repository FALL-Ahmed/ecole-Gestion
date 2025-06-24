import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Importez ConfigService

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
import { ExceptionEmploiDuTempsModule } from './exceptionemploidutemps/exceptionemploidutemps.module'; // Nouvelle importation
import { AbsenceModule } from './absence/absence.module'; // Adaptez le chemin
import { ChapitreModule } from './chapitre/chapitre.module'; // Assurez-vous que le chemin est correct
import { EtablissementInfoModule } from './etablissement/etablissement-info.module';



@Module({
  imports: [
     ConfigModule.forRoot({
      isGlobal: true, // Rend les variables d'environnement disponibles globalement
      envFilePath: '.env', // Chemin vers votre fichier .env local
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Importez ConfigModule pour utiliser ConfigService
      useFactory: (configService: ConfigService) => ({
        type: 'mysql', // Ou 'mariadb' si c'est le cas
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // Chemin vers vos entités
        // Ne jamais utiliser synchronize: true en production !
synchronize: false,
logging: configService.get<string>('NODE_ENV') !== 'production',
            ssl: configService.get<string>('NODE_ENV') === 'production'
              ? { rejectUnauthorized: true }
              : false      }),
      inject: [ConfigService], // Injectez ConfigService dans la factory
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
    ConfigurationModule,
    EmploiDuTempsModule,
    ExceptionEmploiDuTempsModule,
    AbsenceModule,
    ChapitreModule,
    EtablissementInfoModule 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
