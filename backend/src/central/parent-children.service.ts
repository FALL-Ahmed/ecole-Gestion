import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Repository } from 'typeorm';
import { Inscription } from '../inscription/inscription.entity';
import { ChildDto } from './dto/child.dto';
import { TenantConnectionManager } from '../tenant/tenant-connection.manager';

@Injectable({ scope: Scope.REQUEST })
export class ParentChildrenService {
  private inscriptionRepository: Repository<Inscription>;

  constructor(
    private readonly connectionManager: TenantConnectionManager,
    @Inject(REQUEST) private request: any,
  ) {}

  private async initializeRepositories(): Promise<void> {
    const tenantId = this.request.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID not found on request.');
    }
    const dataSource = await this.connectionManager.getDataSource(tenantId);
    this.inscriptionRepository = dataSource.getRepository(Inscription);
  }

  async getChildren(parentId: string): Promise<ChildDto[]> {
    await this.initializeRepositories();

    const inscriptions = await this.inscriptionRepository.find({
      where: { utilisateur: { parentId } },
      relations: ['utilisateur', 'classe', 'annee_scolaire'],
    });

    return inscriptions.map(inscription => ({
      id: inscription.utilisateur.id,
      nom: inscription.utilisateur.nom,
      prenom: inscription.utilisateur.prenom,
      email: inscription.utilisateur.email,
      classe: inscription.classe ? { id: inscription.classe.id, nom: inscription.classe.nom } : undefined,
      anneeScolaire: inscription.annee_scolaire ? { id: inscription.annee_scolaire.id, libelle: inscription.annee_scolaire.libelle } : undefined
    }));
  }
}

