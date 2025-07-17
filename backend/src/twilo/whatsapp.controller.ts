// whatsapp.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/send-whatsapp') // Notez le préfixe 'api/'
export class WhatsAppController {
  constructor(private readonly twilioService: TwilioService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async sendWhatsApp(@Body() body: { to: string; body: string }) {
    const success = await this.twilioService.sendWhatsAppMessage(body.to, body.body);
    if (!success) {
      throw new Error('Erreur lors de l\'envoi du message WhatsApp');
    }
    return { success };
  }
}