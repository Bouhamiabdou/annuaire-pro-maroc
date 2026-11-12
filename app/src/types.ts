export type Source = { titre?: string; url: string };

export type FicheSociete = {
  kind: 'societe';
  raison_sociale: string;
  sigle?: string;
  forme_juridique?: string;
  capital?: string;
  rc?: string;
  tribunal?: string;
  ice?: string;
  identifiant_fiscal?: string;
  patente?: string;
  cnss?: string;
  adresse?: string;
  ville?: string;
  activite?: string;
  date_creation?: string;
  statut?: string;
  telephone?: string;
  dirigeants?: string;
  remarques?: string;
  sources: Source[];
};

export type FichePro = {
  kind: 'pro';
  nom: string;
  profession?: string;
  specialite?: string;
  ordre?: string;
  numero_inscription?: string;
  adresse_cabinet?: string;
  ville?: string;
  telephone_pro?: string;
  site?: string;
  remarques?: string;
  sources: Source[];
};

export type Fiche = FicheSociete | FichePro;

export type Resultat = {
  resultats: Fiche[];
  message?: string;
};

export type Entree = {
  id: string;
  date: string;
  requete: string;
  fiche: Fiche;
};

export function titreFiche(f: Fiche): string {
  return f.kind === 'societe' ? f.raison_sociale : f.nom;
}
