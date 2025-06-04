import { Controller, Get, Post, Body } from "@nestjs/common";
import { CoefficientClasseService } from "./coeff.service";

@Controller("api/coefficientclasse")
export class CoefficientClasseController {
  constructor(private service: CoefficientClasseService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() body: { classe_id: number; matiere_id: number; coefficient: number }) {
    return this.service.create(body);
  }
}