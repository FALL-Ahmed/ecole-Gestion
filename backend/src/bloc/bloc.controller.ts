import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BlocService } from './bloc.service';
import { CreateBlocDto } from './dto/create-bloc.dto';
import { UpdateBlocDto } from './dto/update-bloc.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('api/blocs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BlocController {
  constructor(private readonly blocService: BlocService) {}

  @Post()
  create(@Body() createBlocDto: CreateBlocDto) {
    return this.blocService.create(createBlocDto);
  }

  @Get()
  findAll() {
    return this.blocService.findAll();
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateBlocDto: UpdateBlocDto) {
    return this.blocService.update(id, updateBlocDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.blocService.remove(id);
  }
}

