import { PartialType } from '@nestjs/mapped-types';
import { CreateExceptionEmploiDuTempsDto } from './create-exception-emploi-du-temps.dto';

export class UpdateExceptionEmploiDuTempsDto extends PartialType(CreateExceptionEmploiDuTempsDto) {}
