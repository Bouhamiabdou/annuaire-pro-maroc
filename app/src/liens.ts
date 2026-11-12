// Liens de recherche directe, utilisés quand le quota gratuit est épuisé
// ou quand la recherche ne donne rien. Gratuits et illimités.

import { PROFESSIONS, SOURCES_SOCIETES } from './sources';

export type Lien = { label: string; url: string };

const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

const ANNUAIRES: [string, string][] = [
  ['Welipro', 'maroc.welipro.com'],
  ['BT-Africa', 'bt-africa.com'],
  ['Charika', 'charika.ma'],
  ['Telecontact', 'telecontact.ma'],
];

/** Liens d'ouverture directe dans les annuaires, pour un identifiant ou un nom. */
export function liensSociete(valeur: string, exact = true): Lien[] {
  const v = valeur.trim();
  const q = exact ? `"${v}"` : v;
  return [
    { label: 'Google (tous les annuaires)', url: google(exact ? q : `${v} société Maroc ICE`) },
    ...ANNUAIRES.map(([label, d]) => ({ label, url: google(`site:${d} ${q}`) })),
  ];
}

export function liensPro(professionId: string, criteres: string): Lien[] {
  const prof = PROFESSIONS.find(p => p.id === professionId) ?? PROFESSIONS[0];
  const q = `${prof.label} ${criteres}`.trim();
  return [
    { label: 'Recherche Google', url: google(`${q} Maroc`) },
    ...prof.sources.map(d => ({ label: d, url: google(`site:${d} ${criteres || prof.label}`) })),
  ];
}
