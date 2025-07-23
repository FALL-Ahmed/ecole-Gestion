import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { EcolesModule } from '../ecoles/ecoles.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './admin.entity';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    EcolesModule,
    TypeOrmModule.forFeature([Admin], 'central'),
    forwardRef(() => AuthModule), // <-- AJOUT ICI
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}