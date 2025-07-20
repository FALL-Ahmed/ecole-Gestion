import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { EcolesModule } from '../ecoles/ecoles.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './admin.entity';
import { AdminService } from './admin.service';

@Module({
  imports: [
    EcolesModule,
    TypeOrmModule.forFeature([Admin], 'central'),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}         