import { Module, forwardRef } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { Evaluation } from './evaluation.entity';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
imports: [forwardRef(() => AuthModule)],
  providers: [
    EvaluationService,
    createTenantRepositoryProvider(Evaluation),
  ],
  controllers: [EvaluationController],
})
export class EvaluationModule {}
