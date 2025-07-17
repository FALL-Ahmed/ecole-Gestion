// twilio.module.ts
import { Module } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { ConfigModule } from '@nestjs/config'; // Ajout de cette ligne

@Module({
  imports: [ConfigModule], // Ajout de cette ligne
  providers: [TwilioService],
  exports: [TwilioService]
})
export class TwilioModule {}