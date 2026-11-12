// Liens de recherche directe, utilisés quand le quota gratuit est épuisé
// ou quand la recherche ne donne rien. Gratuits et illimités.

import { PROFESSIONS, SOURCES_SOCIETES } from './sources';

export type Lien = { label: string; url: string };

const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

export function liensSociete(valeur: string): Lien[] {
  const v = valeur.trim();
  return [
    { label: 'Recherche Google', url: google(`"${v}" Maroc société`) },
    ...SOURCES_SOCIETES.slice(0, 5).map(d => ({ label: d, url: google(`site:${d} "${v}"`) })),
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
