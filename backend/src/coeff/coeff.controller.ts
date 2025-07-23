import { Controller, Get, Post, Body, BadRequestException, Param, Put, ParseIntPipe, UseGuards } from "@nestjs/common";
import { CoefficientClasseService } from "./coeff.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "../users/user.entity";

@Controller("api/coefficientclasse")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Seuls les administrateurs peuvent gérer les coefficients
export class CoefficientClasseController {
  constructor(private readonly coefficientClasseService: CoefficientClasseService) {}

  @Get()
  findAll() {
    return this.coefficientClasseService.findAll();
  }

  @Post()
  async createMany(
    @Body() body: { classe_id: number; matiere_id: number; coefficient: number }[]
  ) {
    if (!Array.isArray(body)) {
      throw new BadRequestException("Le corps de la requête doit être un tableau.");
    }

    return this.coefficientClasseService.createMany(body);
  }

  @Post('create-group')
  async createGrouped(
    @Body() body: { classe_id: number; coefficients: { matiere_id: number; coefficient: number }[] }
  ) {
    const { classe_id, coefficients } = body;
    if (!classe_id || !Array.isArray(coefficients) || coefficients.length === 0) {
      throw new BadRequestException("Les champs 'classe_id' et 'coefficients' (tableau non vide) sont requis.");
    }
    return this.coefficientClasseService.createGroupedCoefficients(classe_id, coefficients);
  }

    @Put("update-group")
  async updateGroup(
    @Body() body: { classeId: number; matiereId: number; coefficient: number }
  ) {
    const { classeId, matiereId, coefficient } = body;
    if (!classeId || !matiereId || coefficient === undefined) {
        throw new BadRequestException("Les IDs classeId, matiereId et le coefficient sont requis.");
    }
    return this.coefficientClasseService.updateGroupedCoefficients(classeId, matiereId, coefficient);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { coefficient: number }
  ) {
    if (body.coefficient === undefined || typeof body.coefficient !== 'number') {
      throw new BadRequestException("Le champ 'coefficient' est requis et doit être un nombre.");
    }
    return this.coefficientClasseService.update(id, body.coefficient);
  }

 

  // Nouvelle route POST /api/coefficientclasse/clone
  @Post("clone")
  async cloneCoefficients(
    @Body() body: { fromClasseId: number; toClasseId: number }
  ) {
    const { fromClasseId, toClasseId } = body;

    if (!fromClasseId || !toClasseId) {
      throw new BadRequestException("Les IDs fromClasseId et toClasseId sont requis.");
    }

    return this.coefficientClasseService.cloneCoefficients(fromClasseId, toClasseId);
  }
}
