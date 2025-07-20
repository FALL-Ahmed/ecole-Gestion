import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { Evaluation } from './evaluation.entity';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
imports: [],
  providers: [
    EvaluationService,
    createTenantRepositoryProvider(Evaluation),
  ],
  controllers: [EvaluationController],
})
export class EvaluationModule {}
