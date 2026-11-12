// Fonction serverless Vercel : relais vers l'API Claude.
// La clé reste sur le serveur (variable d'environnement ANTHROPIC_API_KEY).
// L'application n'a donc besoin d'aucune configuration.

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODELE = 'claude-sonnet-5-5';

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
  const apiKey = env('ANTHROPIC_API_KEY');
  if (!apiKey) return json(500, { error: { message: 'Service non configuré (clé serveur absente).' } });

  let body: any;
  try { body = await request.json(); } catch { return json(400, { error: { message: 'Requête invalide.' } }); }

  const { messages, system, tools } = body ?? {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 10) {
    return json(400, { error: { message: 'Requête invalide.' } });
  }
  if (JSON.stringify(messages).length > 6_000_000) {
    return json(413, { error: { message: 'Image trop lourde.' } });
  }

  // Seul l'outil de recherche web est autorisé, avec un plafond d'utilisations.
  const outils = Array.isArray(tools)
    ? tools
        .filter((t: any) => t?.type === 'web_search_20250305')
        .slice(0, 1)
        .map((t: any) => ({
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: Math.min(Number(t.max_uses) || 5, 8),
          ...(Array.isArray(t.allowed_domains) && t.allowed_domains.length
            ? { allowed_domains: t.allowed_domains.slice(0, 30).map(String) }
            : {}),
        }))
    : [];

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: env('ANTHROPIC_MODEL') || MODELE,
      max_tokens: 4096,
      system: typeof system === 'string' ? system.slice(0, 4000) : undefined,
      messages,
      ...(outils.length ? { tools: outils } : {}),
    }),
  });

  const texte = await res.text();
  return new Response(texte, { status: res.status, headers: { 'content-type': 'application/json', ...CORS } });
}
