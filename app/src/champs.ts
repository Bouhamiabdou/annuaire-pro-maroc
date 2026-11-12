import { Fiche } from './types';

const SOCIETE: [string, string][] = [
  ['sigle', 'Sigle'],
  ['forme_juridique', 'Forme juridique'],
  ['capital', 'Capital'],
  ['rc', 'RC'],
  ['tribunal', 'Tribunal'],
  ['ice', 'ICE'],
  ['identifiant_fiscal', 'Identifiant fiscal'],
  ['patente', 'Patente'],
  ['cnss', 'CNSS'],
  ['activite', 'Activité'],
  ['adresse', 'Adresse'],
  ['ville', 'Ville'],
  ['telephone', 'Téléphone'],
  ['date_creation', 'Création'],
  ['statut', 'Statut'],
  ['dirigeants', 'Dirigeants'],
  ['remarques', 'Remarques'],
];

const PRO: [string, string][] = [
  ['profession', 'Profession'],
  ['specialite', 'Spécialité'],
  ['ordre', 'Ordre / barreau'],
  ['numero_inscription', "N° d'inscription"],
  ['adresse_cabinet', 'Cabinet'],
  ['ville', 'Ville'],
  ['telephone_pro', 'Téléphone pro'],
  ['site', 'Site'],
  ['remarques', 'Remarques'],
];

/** Liste [libellé, valeur] des champs renseignés d'une fiche. */
export function champs(f: Fiche): [string, string][] {
  const def = f.kind === 'societe' ? SOCIETE : PRO;
  const o = f as unknown as Record<string, unknown>;
  return def.filter(([k]) => typeof o[k] === 'string' && o[k]).map(([k, l]) => [l, o[k] as string]);
}

export function sousTitre(f: Fiche): string {
  if (f.kind === 'societe') {
    return [f.forme_juridique, f.ice && `ICE ${f.ice}`, f.ville].filter(Boolean).join(' · ');
  }
  return [f.profession, f.specialite, f.ville].filter(Boolean).join(' · ');
}
