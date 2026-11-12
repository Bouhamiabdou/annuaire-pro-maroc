// Fonction serverless Vercel : relais vers l'API Gemini (Google), formule gratuite.
// La clé reste sur le serveur (variable d'environnement GEMINI_API_KEY).
// Entrée  : { system, prompt, image?: { data, mimeType }, recherche: boolean }
// Sortie  : { texte, sources: [{ url, titre }] }  |  { error: { message, code } }

const MODELE = 'gemini-2.5-flash';
const env = (k: string): string | undefined => (globalThis as any).process?.env?.[k];

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const apiKey = env('GEMINI_API_KEY');
  if (!apiKey) return json(500, { error: { message: 'Service non configuré (clé serveur absente).' } });

  let body: any;
  try { body = await request.json(); } catch { return json(400, { error: { message: 'Requête invalide.' } }); }
  const { system, prompt, image, recherche } = body ?? {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000) {
    return json(400, { error: { message: 'Requête invalide.' } });
  }
  if (image && (typeof image.data !== 'string' || image.data.length > 6_000_000)) {
    return json(413, { error: { message: 'Image trop lourde.' } });
  }

  const parts: any[] = [];
  if (image) parts.push({ inline_data: { mime_type: String(image.mimeType || 'image/jpeg'), data: image.data } });
  parts.push({ text: prompt });

  const modele = env('GEMINI_MODEL') || MODELE;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        ...(typeof system === 'string' ? { systemInstruction: { parts: [{ text: system.slice(0, 4000) }] } } : {}),
        ...(recherche ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    });
  } catch {
    return json(502, { error: { message: 'Service de recherche injoignable.' } });
  }

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) {
      return json(429, { error: { code: 'quota', message: 'Quota gratuit du jour atteint.' } });
    }
    return json(res.status, { error: { message: data?.error?.message || `Erreur du service (${res.status}).` } });
  }

  const cand = data?.candidates?.[0];
  const texte = (cand?.content?.parts ?? []).map((p: any) => p?.text ?? '').join('\n');
  const sources = (cand?.groundingMetadata?.groundingChunks ?? [])
    .map((c: any) => c?.web)
    .filter((w: any) => w?.uri)
    .map((w: any) => ({ url: w.uri, titre: w.title }));

  return json(200, { texte, sources });
}
