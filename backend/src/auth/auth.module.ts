import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PreselectionStrategy } from './preselection.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminModule } from '../admin/admin.module';
import { ParentModule } from '../central/parent.module';

@Global()
@Module({
  imports: [
    // Configure PassportModule first with the default strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // Then configure JwtModule
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),

    // Then import other modules
    forwardRef(() => UsersModule),
    forwardRef(() => AdminModule),
    forwardRef(() => ParentModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // This registers the strategy
    PreselectionStrategy,
  ],
  exports: [
    AuthService, 
    PassportModule, // Make sure to export PassportModule
    JwtModule,
  ],
})
export class AuthModule {}