// Moteur de recherche : passe par le relais Vercel (api/claude.ts) qui détient la clé.
// Aucune configuration côté application.

import { Platform } from 'react-native';
import { Fiche, FichePro, FicheSociete, Resultat, Source } from './types';
import { PROFESSIONS, SOURCES_SOCIETES, API_BASE } from './sources';
import { ModeSociete } from './validators';

// Sur le web, l'application et le relais partagent le même domaine.
const API_URL = Platform.OS === 'web' ? '/api/claude' : `${API_BASE}/api/claude`;

type Bloc = { type: string; text?: string; [k: string]: unknown };
type Message = { role: 'user' | 'assistant'; content: string | Bloc[] };

export class ErreurMoteur extends Error {}

async function appeler(messages: Message[], opts: { domains?: string[]; system: string; maxUses?: number }) {
  const tools = opts.domains !== undefined
    ? [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: opts.maxUses ?? 6,
        ...(opts.domains.length ? { allowed_domains: opts.domains } : {}),
      }]
    : undefined;

  const conv = [...messages];
  // Boucle : l'API peut suspendre un tour long (stop_reason = pause_turn).
  for (let i = 0; i < 4; i++) {
    let res: Response;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ system: opts.system, messages: conv, ...(tools ? { tools } : {}) }),
      });
    } catch {
      throw new ErreurMoteur('Connexion impossible. Vérifiez votre accès Internet.');
    }
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json())?.error?.message ?? ''; } catch { /* ignore */ }
      if (res.status === 429) throw new ErreurMoteur('Service momentanément saturé, réessayez dans un instant.');
      throw new ErreurMoteur(detail || `Service indisponible (${res.status}).`);
    }
    const data = await res.json();
    const content: Bloc[] = data.content ?? [];
    if (data.stop_reason === 'pause_turn') {
      conv.push({ role: 'assistant', content });
      continue;
    }
    return content;
  }
  throw new ErreurMoteur('La recherche a pris trop de temps.');
}

function urlsCitees(content: Bloc[]): Source[] {
  const out: Source[] = [];
  for (const b of content) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content as { url?: string; title?: string }[]) {
        if (r.url) out.push({ url: r.url, titre: r.title });
      }
    }
  }
  return out;
}

function extraireJSON(content: Bloc[]): any {
  const texte = content.filter(b => b.type === 'text').map(b => b.text ?? '').join('\n');
  const balise = texte.match(/<json>([\s\S]*?)<\/json>/);
  const brut = balise ? balise[1] : texte.slice(texte.indexOf('{'), texte.lastIndexOf('}') + 1);
  try {
    return JSON.parse(brut);
  } catch {
    throw new ErreurMoteur('Réponse illisible, relancez la recherche.');
  }
}

const REGLES = `Tu es un moteur de recherche d'informations publiques et professionnelles sur le Maroc.
Règles :
- N'affirme que ce que les pages trouvées indiquent. N'invente jamais un numéro (ICE, RC, IF, téléphone).
- Si un champ est inconnu, omets-le.
- Si plusieurs sources divergent, signale-le dans "remarques".
- Chaque fiche liste ses URL dans "sources".
- Réponds en français, uniquement par un objet JSON entre <json> et </json>.`;

const SCHEMA_SOCIETE = `{"resultats":[{"raison_sociale":"","sigle":"","forme_juridique":"","capital":"","rc":"","tribunal":"","ice":"","identifiant_fiscal":"","patente":"","cnss":"","adresse":"","ville":"","activite":"","date_creation":"","statut":"","telephone":"","dirigeants":"","remarques":"","sources":[{"titre":"","url":""}]}],"message":""}`;

const SCHEMA_PRO = `{"resultats":[{"nom":"","profession":"","specialite":"","ordre":"","numero_inscription":"","adresse_cabinet":"","ville":"","telephone_pro":"","site":"","remarques":"","sources":[{"titre":"","url":""}]}],"message":""}`;

function nettoyer<T extends Fiche>(liste: any[], kind: T['kind'], repli: Source[]): T[] {
  return (Array.isArray(liste) ? liste : [])
    .map(o => {
      const f: any = { kind };
      for (const [k, v] of Object.entries(o ?? {})) {
        if (k === 'sources') continue;
        if (typeof v === 'string' && v.trim()) f[k] = v.trim();
      }
      const src = Array.isArray(o?.sources) ? o.sources.filter((s: any) => s?.url) : [];
      f.sources = src.length ? src : repli.slice(0, 3);
      return f as T;
    })
    .filter(f => (kind === 'societe' ? (f as any).raison_sociale : (f as any).nom));
}

const LIBELLES: Record<ModeSociete, string> = {
  ice: 'ICE (Identifiant Commun de l\'Entreprise)',
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
  const question = `Recherche la ou les sociétés marocaines correspondant à ce ${LIBELLES[p.mode]} : "${p.valeur}"${precision}.
Pour un identifiant (ICE, RC, IF), vérifie que l'identifiant trouvé correspond exactement à la recherche.
Renvoie au maximum 8 résultats, du plus pertinent au moins pertinent, au format :
${SCHEMA_SOCIETE}
Si rien n'est trouvé : {"resultats":[],"message":"explication courte"}`;
  const content = await appeler([{ role: 'user', content: question }], { domains, system: REGLES });
  const json = extraireJSON(content);
  return { resultats: nettoyer<FicheSociete>(json.resultats, 'societe', urlsCitees(content)), message: json.message };
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
  const question = `Recherche des professionnels exerçant au Maroc. Profession : ${prof.label}. ${criteres || ''}
Ne renvoie que des informations professionnelles publiées (cabinet, inscription à l'ordre ou au barreau, spécialité, téléphone professionnel). N'inclus jamais d'adresse personnelle ni de donnée privée.
Renvoie au maximum 10 résultats au format :
${SCHEMA_PRO}
Si rien n'est trouvé : {"resultats":[],"message":"explication courte"}`;
  const content = await appeler([{ role: 'user', content: question }], { domains, system: REGLES });
  const json = extraireJSON(content);
  return { resultats: nettoyer<FichePro>(json.resultats, 'pro', urlsCitees(content)), message: json.message };
}

export type Extraction = {
  ice?: string; rc?: string; identifiant_fiscal?: string; raison_sociale?: string; telephone?: string; adresse?: string;
};

/** Lit un ticket, une facture ou un cachet et en extrait les identifiants. */
export async function lireDocument(base64: string, mediaType = 'image/jpeg'): Promise<Extraction> {
  const content = await appeler(
    [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
        {
          type: 'text',
          text: `Extrais de ce document marocain (ticket, facture, cachet) les identifiants de l'émetteur.
Format : <json>{"ice":"","rc":"","identifiant_fiscal":"","raison_sociale":"","telephone":"","adresse":""}</json>
Ne recopie que ce qui est lisible ; laisse vide sinon. Pour un nom tronqué, donne la partie lisible.`,
        },
      ],
    }],
    { system: 'Tu extrais des données de documents. Réponds uniquement en JSON entre <json> et </json>.' },
  );
  const j = extraireJSON(content);
  const out: Extraction = {};
  for (const k of ['ice', 'rc', 'identifiant_fiscal', 'raison_sociale', 'telephone', 'adresse'] as const) {
    if (typeof j[k] === 'string' && j[k].trim()) out[k] = j[k].trim();
  }
  if (out.ice) out.ice = out.ice.replace(/\D/g, '');
  return out;
}
