import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChapitreService } from './chapitre.service';
import { ChapitreController } from './chapitre.controller';
import { Chapitre } from './chapitre.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chapitre]),
  ],
  controllers: [ChapitreController],
  providers: [ChapitreService],
  exports: [ChapitreService]
})
export class ChapitreModule {}
