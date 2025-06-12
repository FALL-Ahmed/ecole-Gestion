import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trimestre } from './trimestre.entity';
import { CreateTrimestreDto } from './create-trimestre.dto';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Injectable()
export class TrimestreService {
  constructor(
    @InjectRepository(Trimestre)
    private readonly trimestreRepo: Repository<Trimestre>,
    @InjectRepository(anneescolaire)
    private readonly anneeRepo: Repository<anneescolaire>,
  ) {}

  async create(data: CreateTrimestreDto): Promise<Trimestre> {
    const annee = await this.anneeRepo.findOne({ where: { id: data.annee_scolaire_id } });
    if (!annee) throw new NotFoundException('Année scolaire non trouvée');

    const trimestre = this.trimestreRepo.create({
      nom: data.nom,
      date_debut: data.date_debut,
      date_fin: data.date_fin,
      anneeScolaire: annee,
    });

    return this.trimestreRepo.save(trimestre);
  }

  async findByDate(date: string, anneeId: number): Promise<Trimestre | null> {
    return this.trimestreRepo
      .createQueryBuilder('trimestre')
      .leftJoinAndSelect('trimestre.anneeScolaire', 'annee')
      .where('trimestre.date_debut <= :date', { date })
      .andWhere('trimestre.date_fin >= :date', { date })
      .andWhere('annee.id = :anneeId', { anneeId })
      .getOne();
  }

  // MODIFICATION ICI : Ajout du paramètre anneeScolaireId optionnel
  async findAll(anneeScolaireId?: number): Promise<Trimestre[]> {
    const queryOptions: any = {
      relations: ['anneeScolaire'],
      order: {
        date_debut: 'ASC', // Tri par date pour un affichage logique
      }
    };

    if (anneeScolaireId) {
      // Si un anneeScolaireId est fourni, ajoutez la condition de filtrage
      queryOptions.where = {
        anneeScolaire: {
          id: anneeScolaireId,
        },
      };
    }

    return this.trimestreRepo.find(queryOptions);
  }
}