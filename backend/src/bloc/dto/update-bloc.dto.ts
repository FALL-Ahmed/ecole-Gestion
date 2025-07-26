import { PartialType } from '@nestjs/mapped-types';
import { CreateBlocDto } from './create-bloc.dto';

export class UpdateBlocDto extends PartialType(CreateBlocDto) {}

