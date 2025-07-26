import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentSearchService } from './parent-search.service';
import { ParentSearchController } from './parent-search.controller';
import { TenantModule } from '../tenant/tenant.module';
import { Ecole } from '../ecoles/ecole.entity';
import { Parent } from '../central/parent.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ecole, Parent], 'central'),
    TenantModule,
    forwardRef(() => AuthModule),
  ],
  providers: [ParentSearchService],
  controllers: [ParentSearchController],
  exports: [ParentSearchService],
})
export class ParentSearchModule {}

