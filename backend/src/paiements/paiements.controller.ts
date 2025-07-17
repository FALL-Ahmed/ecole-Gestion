// paiements.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
   Put, Param,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PaiementService } from './paiements.service';
import { FindPaiementsQueryDto } from './dto/find-paiements-query.dto';
import { EnregistrerPaiementDto } from './dto/enregistrer-paiement.dto';
import { Paiement } from './paiements.entity';
import { RappelPaiementService } from './rappel-paiement.service';

@Controller('api/paiements')
export class PaiementController {
  constructor(
    private readonly paiementService: PaiementService,
    private readonly rappelPaiementService: RappelPaiementService // Injection directe
  ) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findAllByClasse(@Query() query: FindPaiementsQueryDto): Promise<any[]> {
    return this.paiementService.findAllByClasse(query);
  }

@Get('envoyer-rappel')
async envoyerRappel(
  @Query('eleveId') eleveId: number,
  @Query('mois') mois: string
) {
  try {
    const result = await this.rappelPaiementService.envoyerRappelManuel(eleveId, mois);
    
    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
    }

    return result;
  } catch (error) {
    throw new HttpException(
      error.message,
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}
@Put(':id')
async update(
  @Param('id') id: number,
  @Body() updatePaiementDto: EnregistrerPaiementDto
): Promise<Paiement> {
  return this.paiementService.updatePaiement(id, updatePaiementDto);
}

  @Post('enregistrer')
  enregistrer(@Body() enregistrerPaiementDto: EnregistrerPaiementDto): Promise<Paiement> {
    return this.paiementService.enregistrerPaiement(enregistrerPaiementDto);
  }
}