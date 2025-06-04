import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);

    if (!user) {
      // Au cas où validateUser retourne null ou undefined
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    // Retourne l'objet enveloppé dans "user"
    return { user };
  }
}
