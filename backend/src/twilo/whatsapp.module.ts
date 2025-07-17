// whatsapp.module.ts
import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { TwilioModule } from './twilio.module';

@Module({
  imports: [TwilioModule],
  controllers: [WhatsAppController]
})
export class WhatsAppModule {}