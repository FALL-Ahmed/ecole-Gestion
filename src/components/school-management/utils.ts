// Fichier g�n�r� automatiquement - utils.ts
import { Classe, Coefficient } from "./types";

export function sortAnnees(annees: string[]) {
  const order = (annee: string) => {
    if (annee === "Terminale") return 99;
    if (annee === "4ème année (Brevet)") return 4;
    const match = annee.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 100;
  };
  return annees.sort((a, b) => order(a) - order(b));
}

export function groupClassesByNiveauAndAnnee(classes: Classe[]) {
  const grouped: { [niveau: string]: { [annee: string]: Classe[] } } = {};
  classes.forEach(classe => {
    const niveau = (classe.niveau || "Autre").toLowerCase();
    const match = classe.nom.match(/^(\d+)/);
    let annee = "Autre";
    if (match) {
      if (match[1] === "4") {
        annee = "4ème année (Brevet)";
      } else if (match[1] === "7") {
        annee = "Terminale";
      } else {
        annee = `${match[1]}ème année`;
      }
    }
    if (!grouped[niveau]) grouped[niveau] = {};
    if (!grouped[niveau][annee]) grouped[niveau][annee] = [];
    grouped[niveau][annee].push(classe);
  });
  return grouped;
}


export function groupCoefficientsByNiveauEtAnnee(coefficients: Coefficient[], classes: Classe[]) {
  const grouped: { [niveau: string]: { [annee: string]: Coefficient[] } } = {};
  coefficients.forEach(c => {
    const nomClasse = c.classe?.nom || "";
    const niveau = c.classe?.niveau || "Autre";
    const match = nomClasse.match(/^(\d+)/);
    let annee = "Autre";
    if (match) {
      if (match[1] === "4") {
        annee = "4ème année (Brevet)";
      } else if (match[1] === "7") {
        annee = "Terminale";
      } else {
        annee = `${match[1]}ème année`;
      }
    }
    if (!grouped[niveau]) grouped[niveau] = {};
    if (!grouped[niveau][annee]) grouped[niveau][annee] = [];
    grouped[niveau][annee].push(c);
  });
  return grouped;
}

export function groupAffectationsByProf(affectations: Affectation[]) {
  const grouped: { [profId: string]: GroupedAffectation } = {};
  affectations.forEach(aff => {
    const profId = aff.professeur?.id;
    if (!profId) return;
    if (!grouped[profId]) {
      grouped[profId] = {
        professeur: aff.professeur,
        matieres: {},
      };
    }
    const matiereId = aff.matiere?.id;
    if (!grouped[profId].matieres[matiereId]) {
      grouped[profId].matieres[matiereId] = {
        matiere: aff.matiere,
        classes: [],
        annee: aff.annee_scolaire,
      };
    }
    grouped[profId].matieres[matiereId].classes.push(aff.classe);
  });
  return grouped;
}