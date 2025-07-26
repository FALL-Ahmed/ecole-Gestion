import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantConnectionManager } from '../tenant/tenant-connection.manager';
import { Ecole } from '../ecoles/ecole.entity';
import { Parent } from '../central/parent.entity';
import { User, UserRole } from '../users/user.entity';
import { FoundChildDto } from './dto/found-child.dto';

@Injectable()
export class ParentSearchService {
  private readonly logger = new Logger(ParentSearchService.name);

  constructor(
    private connectionManager: TenantConnectionManager,
    @InjectRepository(Ecole, 'central')
    private ecoleRepository: Repository<Ecole>,
    @InjectRepository(Parent, 'central')
    private parentRepository: Repository<Parent>,
  ) {}

  /**
   * Recherche les enfants d'un parent à travers toutes les écoles actives.
   * @param parentId L'ID du parent authentifié.
   * @returns Une liste d'enfants trouvés avec les détails de leur école.
   */
  async findChildrenAcrossAllEcoles(parentId: string): Promise<FoundChildDto[]> {
    const parent = await this.parentRepository.findOneBy({ id: parentId });
    if (!parent) {
      throw new NotFoundException('Parent non trouvé.');
    }

    const allEcoles = await this.ecoleRepository.find();
    this.logger.log(`Recherche pour le parent ID ${parentId} à travers ${allEcoles.length} école(s).`);

    const searchPromises = allEcoles.map(async (ecole) => {
      try {
        const tenantConnection = await this.connectionManager.getDataSource(ecole.db_name);
        if (!tenantConnection) {
          this.logger.warn(`Impossible d'établir la connexion à la base de données pour l'école ${ecole.nom_etablissement} (DB: ${ecole.db_name}).`);
          return [];
        }

        const studentRepository = tenantConnection.getRepository(User);
        const studentsInSchool = await studentRepository.find({
          where: {
            role: UserRole.ETUDIANT,
            parentId: parentId,
          },
        });

        if (studentsInSchool.length > 0) {
          this.logger.log(`Trouvé ${studentsInSchool.length} enfant(s) dans l'école ${ecole.nom_etablissement}.`);
          return studentsInSchool.map((student: User) => ({
            studentInfo: {
              id: student.id,
              nom: student.nom,
              prenom: student.prenom,
            },
            schoolInfo: {
              id: ecole.id, // C'est le blocId !
              nom: ecole.nom_etablissement,
            },
          }));
        }
        return [];
      } catch (error) {
        this.logger.error(`Erreur lors de la recherche dans l'école ${ecole.nom_etablissement} (DB: ${ecole.db_name})`, error.stack);
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    return results.flat();
  }
}
