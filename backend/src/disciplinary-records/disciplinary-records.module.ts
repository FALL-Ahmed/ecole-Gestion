import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisciplinaryRecordsController } from './disciplinary-records.controller';
import { DisciplinaryRecordsService } from './disciplinary-records.service';
import { DisciplinaryRecord } from './disciplinary-record.entity';
import { User } from '../users/user.entity';
import { Classe } from '../classe/classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';
import { TwilioModule } from '../twilo/twilio.module'; // Ajout de cette ligne
import { EtablissementInfoModule } from '../etablissement/etablissement-info.module'; // <-- IMPORTATION

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DisciplinaryRecord,
      User,
      Classe,
      anneescolaire
    ]),
    TwilioModule, // Ajout de cette ligne
        EtablissementInfoModule, // <-- AJOUT ICI

  ],
  controllers: [DisciplinaryRecordsController],
  providers: [DisciplinaryRecordsService],
})
export class DisciplinaryRecordsModule {}