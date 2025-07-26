import { Injectable, Logger } from '@nestjs/common';
import { Inscription } from '../inscription/inscription.entity';
import { ChildDto } from './dto/child.dto';
import { TenantConnectionManager } from '../tenant/tenant-connection.manager';

// Define an intermediate type for clarity
type InscriptionWithBloc = Inscription & { blocId: number };

@Injectable() // Le service n'est plus lié à une requête spécifique (request-scoped)
export class ParentChildrenService {
  private readonly logger = new Logger(ParentChildrenService.name);

  constructor(private readonly connectionManager: TenantConnectionManager) {}

  async getChildren(parentId: string): Promise<ChildDto[]> {
    const allTenantIds = await this.connectionManager.getAllTenantIds();
    const childrenPromises: Promise<InscriptionWithBloc[]>[] = [];

    this.logger.debug(`[getChildren] Recherche des enfants pour le parent ${parentId} à travers les tenants: ${allTenantIds.join(', ')}`);

    for (const tenantId of allTenantIds) {
      const promise = (async (): Promise<InscriptionWithBloc[]> => {
        try {
          const dataSource = await this.connectionManager.getDataSource(tenantId);
          const inscriptionRepository = dataSource.getRepository(Inscription);

          const inscriptions = await inscriptionRepository.find({
            where: {
              utilisateur: { parentId: parentId },
              actif: true,
            },
            relations: ['utilisateur', 'classe', 'annee_scolaire'], // <-- IMPORTANT: Charger l'année scolaire
          });

          const blocId = parseInt(tenantId.replace('bloc_', ''), 10);
          if (isNaN(blocId)) {
            this.logger.warn(`[getChildren] TenantId invalide, ignoré: ${tenantId}`);
            return [];
          }

          // Retourner l'objet inscription complet avec le blocId attaché
          return inscriptions.map(inscription => ({
            ...inscription,
            blocId: blocId,
          }));
        } catch (error) {
          this.logger.error(`Erreur lors de la recherche des enfants dans le tenant ${tenantId}:`, error);
          return []; // Retourne un tableau vide en cas d'erreur pour ce tenant
        }
      })();
      childrenPromises.push(promise);
    }

    const results = await Promise.all(childrenPromises);
    const allInscriptions: InscriptionWithBloc[] = results.flat();

    // Regrouper toutes les inscriptions par ID d'enfant
    const inscriptionsByChild = allInscriptions.reduce((acc, inscription) => {
      const childId = inscription.utilisateur.id;
      if (!acc.has(childId)) {
        acc.set(childId, []);
      }
      acc.get(childId)!.push(inscription);
      return acc;
    }, new Map<number, InscriptionWithBloc[]>());

    const finalChildren: ChildDto[] = [];

    // Pour chaque enfant, trouver l'inscription la plus récente
    for (const childInscriptions of inscriptionsByChild.values()) {
      // Trier par date de fin de l'année scolaire, de la plus récente à la plus ancienne
      const mostRecentInscription = childInscriptions.sort((a, b) => {
        const dateA = a.annee_scolaire?.date_fin ? new Date(a.annee_scolaire.date_fin).getTime() : 0;
        const dateB = b.annee_scolaire?.date_fin ? new Date(b.annee_scolaire.date_fin).getTime() : 0;
        return dateB - dateA;
      })[0]; // Prendre la première après le tri

      if (mostRecentInscription) {
        finalChildren.push({
          id: mostRecentInscription.utilisateur.id,
          nom: mostRecentInscription.utilisateur.nom,
          prenom: mostRecentInscription.utilisateur.prenom,
          email: mostRecentInscription.utilisateur.email,
          photoUrl: mostRecentInscription.utilisateur.photoUrl,
          classe: mostRecentInscription.classe ? { id: mostRecentInscription.classe.id, nom: mostRecentInscription.classe.nom } : undefined,
          blocId: mostRecentInscription.blocId,
        });
      }
    }
    
    this.logger.debug(`[getChildren] ${allInscriptions.length} inscription(s) trouvée(s), retournant ${finalChildren.length} enfant(s) unique(s) pour le parent ${parentId}.`);
    return finalChildren;
  }
}
