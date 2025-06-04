import { Controller, Get, Post, Body, BadRequestException } from "@nestjs/common";
import { CoefficientClasseService } from "./coeff.service";

@Controller("api/coefficientclasse")
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
