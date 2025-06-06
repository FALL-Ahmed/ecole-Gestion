import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { Evaluation } from './evaluation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Evaluation])],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
