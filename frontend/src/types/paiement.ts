export enum StatutPaiement {
  NON_PAYE = 'Non Payé',
  PARTIEL = 'Partiel',
  PAYE = 'Payé',
}

export interface Paiement {
  id: number;
  mois: string;
  montantAttendu: number;
  montantPaye: number;
  statut: StatutPaiement;
  dateDernierPaiement: string | null;
  createdAt: string;
  updatedAt: string;
  eleveId: number;
  anneeScolaireId: number;
}
