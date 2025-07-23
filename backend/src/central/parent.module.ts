import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentController } from './parent.controller';
import { ParentService } from './parent.service';
import { Parent } from './parent.entity';
import { ParentChildrenService } from './parent-children.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parent], 'central'),
    forwardRef(() => AuthModule), // <-- AJOUT ICI
  ],
  controllers: [ParentController],
  providers: [ParentService, ParentChildrenService],
  exports: [ParentService],
})
export class ParentModule {}