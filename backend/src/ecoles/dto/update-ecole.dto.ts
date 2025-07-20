import { PartialType } from '@nestjs/mapped-types';
import { CreateEcoleDto } from './create-ecole.dto';

export class UpdateEcoleDto extends PartialType(CreateEcoleDto) {}

