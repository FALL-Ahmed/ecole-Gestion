import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminModule } from '../admin/admin.module';
import { ParentModule } from '../central/parent.module';

@Global()
@Module({
  imports: [
    // Configuration Passport AVEC la stratégie enregistrée
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // Configuration JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'dev_secret_key',
        signOptions: { expiresIn: '7d' },
      }),
    }),

    // Modules nécessaires avec forwardRef
    forwardRef(() => UsersModule),
    forwardRef(() => AdminModule),
    forwardRef(() => ParentModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // La stratégie est bien enregistrée ici
  ],
  exports: [
    AuthService,
    PassportModule, // Exportez PassportModule
    JwtModule,     // Exportez JwtModule
  ],
})
export class AuthModule {}