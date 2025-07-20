import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, Put, Query, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe, UseGuards, Req } from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

import { ParentService } from './parent.service';
import { Parent } from './parent.entity';
import { CreerParentDto } from './dto/creer-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ParentChildrenService } from './parent-children.service';
import { ChildDto } from './dto/child.dto';

@Controller('api/parents')
export class ParentController {
  constructor(
    private readonly parentService: ParentService,
    private readonly parentChildrenService: ParentChildrenService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() dto: CreerParentDto): Promise<Parent> {
    return this.parentService.create(dto);
  }

 @Get()
  async findAll(@Query('actif') actif?: boolean): Promise<Parent[]> {
    // tu peux ajouter un filtre actif ici si besoin
    return this.parentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Parent> {
    return this.parentService.findOne(id);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParentDto,
  ): Promise<Parent> {
    return this.parentService.update(id, dto);
  }

  @Patch('change-password')
@UsePipes(new ValidationPipe({ transform: true }))
async changePassword(
  @Body() dto: ChangePasswordDto & { parentId: string },
) {
  await this.parentService.changePassword(dto.parentId, dto.currentPassword, dto.newPassword);
  return { message: 'Mot de passe modifié avec succès.' };
}

  @Get('find/by-details')
  async findByTuteurInfo(
    @Query('nom') nom?: string,
    @Query('telephone') telephone?: string,
    @Query('email') email?: string
  ): Promise<Parent | null> {
    return this.parentService.findByTuteurInfo(nom, telephone, email);
  }

  @Get(':id/password')
  @UseGuards(AuthGuard('jwt')) // Sécurise cet endpoint
  async getPassword(@Param('id', ParseUUIDPipe) id: string) {
    const parent = await this.parentService.findOne(id);
    return { mot_de_passe: parent.mot_de_passe };
  }

@Get(':id/children')
async getChildren(@Param('id', ParseUUIDPipe) id: string): Promise<ChildDto[]> {
  return this.parentChildrenService.getChildren(id);
}

  @Get(':id/exists')
  async exists(@Param('id', ParseUUIDPipe) id: string) {
    return { exists: await this.parentService.exists(id) };
  }

  @Get(':id/basic-info')
  async getBasicInfo(@Param('id', ParseUUIDPipe) id: string) {
    return this.parentService.getBasicInfo(id);
  }

  @Get('search')
  @UsePipes(new ValidationPipe({ transform: true }))
  async searchParents(
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    return this.parentService.searchParents(query, limit);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.parentService.remove(id);
  }
}