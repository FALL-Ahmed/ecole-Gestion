// twilio.service.ts
import { Injectable } from '@nestjs/common';
import * as Twilio from 'twilio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwilioService {
  private readonly client: Twilio.Twilio;

  constructor(private configService: ConfigService) {
    this.client = Twilio(
      this.configService.get('TWILIO_ACCOUNT_SID'),
      this.configService.get('TWILIO_AUTH_TOKEN'),
      {
        accountSid: this.configService.get('TWILIO_ACCOUNT_SID')
      }
    );
  }

  async sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
    try {
      await this.client.messages.create({
        body,
        from: `whatsapp:${this.configService.get('TWILIO_PHONE_NUMBER')}`,
        to: `whatsapp:${to}`
      });
      return true;
    } catch (error) {
      console.error('Twilio Error:', error);
      return false;
    }
  }
}