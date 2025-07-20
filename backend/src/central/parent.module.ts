import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentController } from './parent.controller';
import { ParentService } from './parent.service';
import { Parent } from './parent.entity';
import { ParentChildrenService } from './parent-children.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parent], 'central'),
  ],
  controllers: [ParentController],
  providers: [ParentService, ParentChildrenService],
  exports: [ParentService],
})
export class ParentModule {}
