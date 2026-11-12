// Fonction Netlify : réutilise le relais Gemini de api/recherche.ts.
import { POST, OPTIONS } from '../../api/recherche';

export default async (req: Request) => (req.method === 'OPTIONS' ? OPTIONS() : POST(req));

export const config = { path: '/api/recherche' };
