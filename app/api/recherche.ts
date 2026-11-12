// Relais serverless (Netlify / Vercel) — 100 % formules gratuites :
//  - Tavily  : recherche web (1 000 recherches/mois gratuites)  -> TAVILY_API_KEY
//  - Gemini  : mise en fiche + lecture de photos (gratuit)       -> CLE_GEMINI
// Entrée  : { system, prompt, image?: { data, mimeType }, recherche?: { requete, domaines? } }
// Sortie  : { texte, sources: [{ url, titre }] }  |  { error: { message, code? } }

const MODELE = 'gemini-flash-lite-latest';
const VERSION = '2026-11-12.9';
const env = (k: string): string =>
  ((globalThis as any).process?.env?.[k] ?? '').trim().replace(/^["']+|["']+$/g, '').trim();

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'x-relais-version': VERSION,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

type Trouve = { url: string; titre?: string; extrait?: string };

class Erreur extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function chercherWeb(requete: string, domaines: string[]): Promise<Trouve[]> {
  const cle = env('TAVILY_API_KEY');
  if (!cle) throw new Erreur(500, 'Service non configuré (TAVILY_API_KEY absente).');

  const appel = async (doms: string[]) => {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cle}` },
      body: JSON.stringify({
        query: requete.slice(0, 380),
        search_depth: 'basic',
        max_results: 6,
        include_raw_content: true, // texte complet des pages, pas seulement un extrait
        ...(doms.length ? { include_domains: doms.slice(0, 20) } : {}),
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (res.status === 429 || res.status === 432 || res.status === 433) {
      throw new Erreur(429, 'Quota gratuit de recherche atteint.', 'quota');
    }
    if (res.status === 401) throw new Erreur(500, 'Clé Tavily invalide sur le serveur.');
    if (!res.ok) throw new Erreur(502, data?.detail?.error || `Recherche indisponible (${res.status}).`);
    return (data.results ?? []).map((r: any) => ({ url: r.url, titre: r.title, extrait: String(r.raw_content || r.content || '').replace(/\s+/g, ' ').slice(0, 5000) }));
  };

  let trouves: Trouve[] = await appel(domaines);
  // Peu de résultats dans les annuaires ciblés : on complète une fois avec tout le web.
  if (trouves.length < 4 && domaines.length) {
    const vus = new Set(trouves.map(t => t.url));
    trouves = [...trouves, ...(await appel([])).filter((t: Trouve) => !vus.has(t.url))];
  }
  return trouves;
}

async function gemini(system: string | undefined, parts: any[]): Promise<string> {
  // Netlify injecte lui-même GEMINI_API_KEY (jeton de son AI Gateway, inutilisable chez Google).
  // La clé personnelle se lit donc dans CLE_GEMINI ; GEMINI_API_KEY ne sert que hors Netlify.
  const cle = env('CLE_GEMINI') || env('GEMINI_API_KEY');
  if (!cle) throw new Erreur(500, 'Service non configuré (CLE_GEMINI absente).');
  const modele = env('GEMINI_MODEL') || MODELE;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`;

  for (let essai = 0; essai < 2; essai++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': cle },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        ...(system ? { systemInstruction: { parts: [{ text: system.slice(0, 4000) }] } } : {}),
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: 'application/json' },
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (res.ok) {
      return (data?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? '').join('\n');
    }
    const msg: string = data?.error?.message ?? '';
    if (res.status === 503 && essai === 0) { await new Promise(r => setTimeout(r, 1500)); continue; }
    if (res.status === 429) throw new Erreur(429, 'Quota gratuit Gemini atteint.', 'quota');
    if (/API key not valid|API_KEY_INVALID/i.test(msg)) throw new Erreur(500, env('CLE_GEMINI') ? 'Clé Gemini invalide sur le serveur (variable CLE_GEMINI).' : 'Variable CLE_GEMINI absente sur le serveur.');
    if (res.status === 402) throw new Erreur(500, 'Clé Gemini liée à un projet payant sans crédit : utilisez une clé de projet gratuit.');
    throw new Erreur(res.status, msg || `Erreur du service (${res.status}).`);
  }
  throw new Erreur(503, 'Service momentanément surchargé, réessayez.');
}

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return json(400, { error: { message: 'Requête invalide.' } }); }
  const { system, prompt, image, recherche } = body ?? {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000) {
    return json(400, { error: { message: 'Requête invalide.' } });
  }
  if (image && (typeof image.data !== 'string' || image.data.length > 6_000_000)) {
    return json(413, { error: { message: 'Image trop lourde.' } });
  }

  try {
    let sources: Trouve[] = [];
    let contexte = '';
    if (recherche && typeof recherche.requete === 'string' && recherche.requete.trim()) {
      const domaines = Array.isArray(recherche.domaines) ? recherche.domaines.map(String) : [];
      sources = await chercherWeb(recherche.requete, domaines);
      contexte = sources.length
        ? 'Résultats de recherche web (seule base autorisée pour ta réponse) :\n\n' +
          sources.map((s, i) => `[${i + 1}] ${s.titre ?? ''}\nURL : ${s.url}\n${s.extrait ?? ''}`).join('\n\n')
        : 'La recherche web n\'a donné aucun résultat.';
    }

    const parts: any[] = [];
    if (image) parts.push({ inline_data: { mime_type: String(image.mimeType || 'image/jpeg'), data: image.data } });
    parts.push({ text: contexte ? `${contexte}\n\n---\n\n${prompt}` : prompt });

    const texte = await gemini(typeof system === 'string' ? system : undefined, parts);
    return json(200, { texte, sources: sources.map(s => ({ url: s.url, titre: s.titre })) });
  } catch (e: any) {
    if (e instanceof Erreur) return json(e.status, { error: { message: e.message, code: e.code } });
    return json(502, { error: { message: 'Service de recherche injoignable.' } });
  }
}
