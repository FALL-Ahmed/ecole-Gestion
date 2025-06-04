import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module'; // 👈 import du module


@Module({
  imports: [UsersModule], // 👈 ajoute ici
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
