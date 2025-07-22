import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface PreselectionPayload {
  sub: number;
}

@Injectable()
export class PreselectionStrategy extends PassportStrategy(Strategy, 'jwt-preselection') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_PRESELECTION_SECRET');
    if (!secret) {
      throw new Error("Le secret JWT de présélection n'est pas défini dans les variables d'environnement (JWT_PRESELECTION_SECRET).");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, 
      secretOrKey: secret,
    });
  }

  async validate(payload: PreselectionPayload): Promise<{ userId: number }> {
    return { userId: payload.sub };
  }
}
