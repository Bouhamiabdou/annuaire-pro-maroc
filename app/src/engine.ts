// Moteur de recherche : passe par le relais (api/recherche.ts) : recherche web Tavily,
// puis mise en fiche par Gemini. Aucune configuration côté application.

import { Platform } from 'react-native';
import { FichePro, FicheSociete, Resultat, Source } from './types';
import { PROFESSIONS, SOURCES_SOCIETES, API_BASE } from './sources';
import { ModeSociete } from './validators';

// Sur le web, l'application et le relais partagent le même domaine.
const API_URL = Platform.OS === 'web' ? '/api/recherche' : `${API_BASE}/api/recherche`;

export class ErreurMoteur extends Error {
  constructor(message: string, public quota = false) { super(message); }
}

type Reponse = { texte: string; sources: Source[] };

async function appeler(p: {
  system: string; prompt: string;
  recherche?: { requete: string; domaines: string[] };
  image?: { data: string; mimeType: string };
}): Promise<Reponse> {
  let res: Response;
  try {
    res = await fetch(API_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) });
  } catch {
    throw new ErreurMoteur('Connexion impossible. Vérifiez votre accès Internet.');
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) {
      throw new ErreurMoteur('Quota gratuit du jour atteint. Utilisez les liens de recherche directe ci-dessous.', true);
    }
    throw new ErreurMoteur(data?.error?.message || `Service indisponible (${res.status}).`);
  }
  return { texte: data.texte ?? '', sources: Array.isArray(data.sources) ? data.sources : [] };
}

function extraireJSON(texte: string): any {
  const balise = texte.match(/<json>([\s\S]*?)<\/json>/);
  const bloc = texte.match(/```(?:json)?\s*([\s\S]*?)```/);
  const brut = balise ? balise[1] : bloc ? bloc[1] : texte.slice(texte.indexOf('{'), texte.lastIndexOf('}') + 1);
  try {
    return JSON.parse(brut);
  } catch {
    throw new ErreurMoteur('Réponse illisible, relancez la recherche.');
  }
}

const REGLES = `Tu es un moteur de recherche d'informations publiques et professionnelles sur le Maroc.
Règles :
- N'affirme que ce que les résultats de recherche fournis indiquent.
- N'invente jamais un numéro (ICE, RC, IF, téléphone, inscription). Si un champ est inconnu, omets-le.
- Si plusieurs sources divergent, signale-le dans "remarques".
- Les noms marocains s'écrivent de plusieurs façons en lettres latines (Agdach, Aguedach, Agdache ; Benali, Ben Ali). Traite ces variantes comme le même nom, et accepte les abréviations (ophtalmo = ophtalmologue).
- Si aucun résultat ne correspond exactement, renvoie quand même les résultats les plus proches plutôt qu'une liste vide, en indiquant l'écart dans "remarques" (orthographe ou spécialité différente).
- Chaque fiche liste dans "sources" les URL des résultats utilisés (copiées telles quelles).
- Réponds en français, uniquement par l'objet JSON demandé, sans balise ni autre texte.`;

const SCHEMA_SOCIETE = `{"resultats":[{"raison_sociale":"","sigle":"","forme_juridique":"","capital":"","rc":"","tribunal":"","ice":"","identifiant_fiscal":"","patente":"","cnss":"","adresse":"","ville":"","activite":"","date_creation":"","statut":"","telephone":"","dirigeants":"","remarques":"","sources":[{"titre":"","url":""}]}],"message":""}`;

const SCHEMA_PRO = `{"resultats":[{"nom":"","profession":"","specialite":"","ordre":"","numero_inscription":"","adresse_cabinet":"","ville":"","telephone_pro":"","site":"","remarques":"","sources":[{"titre":"","url":""}]}],"message":""}`;

function nettoyer<T extends FicheSociete | FichePro>(liste: any[], kind: T['kind'], repli: Source[]): T[] {
  return (Array.isArray(liste) ? liste : [])
    .map(o => {
      const f: any = { kind };
      for (const [k, v] of Object.entries(o ?? {})) {
        if (k === 'sources') continue;
        if (typeof v === 'string' && v.trim()) f[k] = v.trim();
      }
      const src = Array.isArray(o?.sources) ? o.sources.filter((s: any) => typeof s?.url === 'string' && /^https?:/.test(s.url)) : [];
      f.sources = src.length ? src : repli.slice(0, 4);
      return f as T;
    })
    .filter(f => (kind === 'societe' ? (f as any).raison_sociale : (f as any).nom));
}

const LIBELLES: Record<ModeSociete, string> = {
  ice: "ICE (Identifiant Commun de l'Entreprise)",
  rc: 'numéro de Registre du Commerce',
  if: 'Identifiant Fiscal',
  nom: 'raison sociale ou enseigne',
  tel: 'numéro de téléphone',
  adresse: 'adresse',
};

export async function rechercherSociete(p: {
  mode: ModeSociete; valeur: string; tribunal?: string; webEntier?: boolean;
}): Promise<Resultat> {
  const domains = p.webEntier ? [] : SOURCES_SOCIETES;
  const precision = p.mode === 'rc' && p.tribunal ? ` (tribunal de commerce de ${p.tribunal})` : '';
  const prompt = `Recherche la ou les sociétés marocaines correspondant à ce ${LIBELLES[p.mode]} : "${p.valeur}"${precision}.
Pour un identifiant (ICE, RC, IF), vérifie que l'identifiant trouvé correspond exactement à la recherche.
Pour une raison sociale, accepte les fautes de frappe et variantes proches (pize food = Pisé Food) et classe d'abord le nom le plus ressemblant.
Remplis tous les champs présents dans les pages (ICE, IF, RC, tribunal, adresse, forme, date, statut).
Renvoie au maximum 8 résultats, du plus pertinent au moins pertinent, au format :
${SCHEMA_SOCIETE}
Si rien n'est trouvé : {"resultats":[],"message":"explication courte"}`;
  // Un identifiant se cherche tel quel, entre guillemets : c'est ce qui donne les meilleurs résultats.
  const requete = p.mode === 'ice' ? `"${p.valeur}"` :
    p.mode === 'rc' ? `"${p.valeur}" RC ${p.tribunal ?? ''} société Maroc` :
    p.mode === 'if' ? `"${p.valeur}" identifiant fiscal société Maroc` :
    p.mode === 'tel' ? `"${p.valeur}" Maroc` :
    p.mode === 'adresse' ? `${p.valeur} société Maroc` : `${p.valeur} société Maroc ICE RC`;
  // L'ICE est unique : recherche directe sur tout le web (une seule requête).
  const domaines = p.mode === 'ice' ? [] : domains;
  const r = await appeler({ system: REGLES, prompt, recherche: { requete, domaines } });
  const json = extraireJSON(r.texte);
  return { resultats: nettoyer<FicheSociete>(json.resultats, 'societe', r.sources), message: json.message };
}

const ABREVIATIONS: Record<string, string> = {
  ophtalmo: 'ophtalmologue', cardio: 'cardiologue', dermato: 'dermatologue', gyneco: 'gynécologue',
  'gynéco': 'gynécologue', gastro: 'gastro-entérologue', neuro: 'neurologue', pneumo: 'pneumologue',
  rhumato: 'rhumatologue', uro: 'urologue', orl: 'ORL oto-rhino-laryngologiste', psy: 'psychiatre',
  ortho: 'orthopédiste', endocrino: 'endocrinologue', nephro: 'néphrologue', 'néphro': 'néphrologue',
  radio: 'radiologue', pedo: 'pédiatre', 'pédia': 'pédiatre', generaliste: 'médecin généraliste',
};

/** Développe les abréviations courantes de spécialité pour la recherche. */
function developper(specialite?: string): string {
  const v = (specialite ?? '').trim();
  return ABREVIATIONS[v.toLowerCase()] ?? v;
}

export async function rechercherPro(p: {
  professionId: string; nom?: string; specialite?: string; ville?: string; numero?: string; webEntier?: boolean;
}): Promise<Resultat> {
  const prof = PROFESSIONS.find(x => x.id === p.professionId) ?? PROFESSIONS[0];
  const domains = p.webEntier ? [] : prof.sources;
  const criteres = [
    p.nom && `nom : ${p.nom}`,
    p.specialite && `spécialité : ${p.specialite}`,
    p.ville && `ville ou quartier : ${p.ville}`,
    p.numero && `numéro d'inscription : ${p.numero}`,
  ].filter(Boolean).join(' ; ');
  const prompt = `Recherche des professionnels exerçant au Maroc. Profession : ${prof.label}. ${criteres}
Ne renvoie que des informations professionnelles publiées (cabinet, inscription à l'ordre ou au barreau, spécialité, téléphone professionnel). N'inclus jamais d'adresse personnelle ni de donnée privée.
Renvoie tous les résultats qui correspondent ou s'en approchent (10 au maximum), les plus proches de la demande en premier, au format :
${SCHEMA_PRO}
Si rien n'est trouvé : {"resultats":[],"message":"explication courte"}`;
  const spec = developper(p.specialite);
  const requete = [p.nom && (['medecin', 'dentiste'].includes(prof.id) ? `Dr ${p.nom}` : `${prof.label} ${p.nom}`), spec || prof.label, p.ville, p.numero, 'Maroc'].filter(Boolean).join(' ');
  const r = await appeler({ system: REGLES, prompt, recherche: { requete, domaines: domains } });
  const json = extraireJSON(r.texte);
  return { resultats: nettoyer<FichePro>(json.resultats, 'pro', r.sources), message: json.message };
}

export type Extraction = {
  ice?: string; rc?: string; identifiant_fiscal?: string; raison_sociale?: string; telephone?: string; adresse?: string;
};

/** Lit un ticket, une facture ou un cachet et en extrait les identifiants. */
export async function lireDocument(base64: string, mimeType = 'image/jpeg'): Promise<Extraction> {
  const r = await appeler({
    system: 'Tu extrais des données de documents. Réponds uniquement par l\'objet JSON demandé.',
    image: { data: base64, mimeType },
    prompt: `Extrais de ce document marocain (ticket, facture, cachet) les identifiants de l'émetteur.
Format : {"ice":"","rc":"","identifiant_fiscal":"","raison_sociale":"","telephone":"","adresse":""}
Ne recopie que ce qui est lisible ; laisse vide sinon. Pour un nom tronqué, donne la partie lisible.`,
  });
  const j = extraireJSON(r.texte);
  const out: Extraction = {};
  for (const k of ['ice', 'rc', 'identifiant_fiscal', 'raison_sociale', 'telephone', 'adresse'] as const) {
    if (typeof j[k] === 'string' && j[k].trim()) out[k] = j[k].trim();
  }
  if (out.ice) out.ice = out.ice.replace(/\D/g, '');
  return out;
}
