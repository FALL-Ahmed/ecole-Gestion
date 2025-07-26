import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../historique/historique.service';
import { getNamespace } from 'cls-hooked';

// --- Import des entités à tracer ---
import { Classe } from '../classe/classe.entity';
import { User } from '../users/user.entity'; // Attention, adapte selon ton vrai import
import { CoefficientClasse } from '../coeff/coeff.entity';
import { Absence } from '../absence/absence.entity';
import { EmploiDuTemps } from '../emploidutemps/emploidutemps.entity';
import { Matiere } from '../matieres/matiere.entity';
import { Affectation } from '../affectation/affectation.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  // Liste des entités à auditer
  private entitiesToAudit = [
    User,
    Classe,
    CoefficientClasse,
    Absence,
    EmploiDuTemps,
    Matiere,
    Affectation,
    anneescolaire,
  ];

  constructor(private readonly auditLogService: AuditLogService) {}

  // Méthode pour savoir si l'entité doit être audité
  private isEntityAudited(target: any): boolean {
    return this.entitiesToAudit.includes(target);
  }

  // Récupérer l'ID utilisateur depuis le contexte CLS (ou système par défaut)
  private getUserId(): number | null {
    const namespace = getNamespace('request');
    if (namespace && namespace.get('user')) {
      return namespace.get('user').userId;
    }
    return null;
  }

  // Récupérer le nom complet de l'utilisateur
  private getUserName(): string {
    const namespace = getNamespace('request');
    if (namespace && namespace.get('user')) {
      const user = namespace.get('user');
      return `${user.prenom} ${user.nom}`;
    }
    return 'Système';
  }

  // Récupérer l'ID du bloc depuis le contexte CLS
  private getBlocId(): number | null {
    const namespace = getNamespace('request');
    if (namespace && namespace.get('user')) {
      return namespace.get('user').blocId;
    }
    return null;
  }

  // Générer une description lisible de l'entité (nom, titre, libelle, etc.)
  private getEntityDescription(entityName: string, entity: any): string {
    const nameProps = ['nom', 'titre', 'libelle'];
    for (const prop of nameProps) {
      if (entity && entity[prop] && typeof entity[prop] === 'string') {
        return `(${entity[prop]})`;
      }
    }
    if (entityName.toLowerCase() === 'utilisateur' && entity && entity.prenom && entity.nom) {
      return `(${entity.prenom} ${entity.nom})`;
    }
    return '';
  }

  async afterInsert(event: InsertEvent<any>) {
    if (!this.isEntityAudited(event.metadata.target)) return;

    const userId = this.getUserId();
    const blocId = this.getBlocId();
    if (!userId || !blocId) return;

    if (!event.entity) return;

    const entityName = event.metadata.tableName;
    const userName = this.getUserName();
    const entityDescription = this.getEntityDescription(entityName, event.entity);

    await this.auditLogService.logAction({
      userId,
      blocId,
      action: 'CREATE',
      entite: entityName,
      entiteId: event.entity.id,
      description: `${userName} a créé l'entité ${entityName} #${event.entity.id} ${entityDescription}`.trim(),
      details: { apres: event.entity },
    });
  }

  async afterUpdate(event: UpdateEvent<any>) {
    if (!this.isEntityAudited(event.metadata.target)) return;

    const userId = this.getUserId();
    const blocId = this.getBlocId();
    if (!userId || !blocId) return;

    if (!event.entity || !event.databaseEntity) return;

    const entityName = event.metadata.tableName;
    const userName = this.getUserName();
    const entityDescription = this.getEntityDescription(entityName, event.databaseEntity);

    await this.auditLogService.logAction({
      userId,
      blocId,
      action: 'UPDATE',
      entite: entityName,
      entiteId: event.databaseEntity.id,
      description: `${userName} a modifié l'entité ${entityName} #${event.databaseEntity.id} ${entityDescription}`.trim(),
      details: { avant: event.databaseEntity, apres: event.entity },
    });
  }

  async afterRemove(event: RemoveEvent<any>) {
    if (!this.isEntityAudited(event.metadata.target)) return;

    const userId = this.getUserId();
    const blocId = this.getBlocId();
    if (!userId || !blocId) return;

    if (!event.entity) return;

    const entityName = event.metadata.tableName;
    const userName = this.getUserName();
    const entityDescription = this.getEntityDescription(entityName, event.entity);

    await this.auditLogService.logAction({
      userId,
      blocId,
      action: 'DELETE',
      entite: entityName,
      entiteId: event.entity.id,
      description: `${userName} a supprimé l'entité ${entityName} #${event.entity.id} ${entityDescription}`.trim(),
      details: { avant: event.entity },
    });
  }
}
