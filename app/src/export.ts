import { Platform, Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Fiche, titreFiche } from './types';
import { champs } from './champs';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function ficheEnTexte(f: Fiche): string {
  const lignes = champs(f).map(([l, v]) => `${l} : ${v}`);
  const src = f.sources.map(s => `- ${s.url}`);
  return [titreFiche(f), '', ...lignes, '', 'Sources :', ...src].join('\n');
}

function ficheEnHtml(f: Fiche): string {
  const date = new Date().toLocaleDateString('fr-MA');
  const rows = champs(f)
    .map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>`)
    .join('');
  const src = f.sources.map(s => `<li>${esc(s.titre || s.url)}<br/><small>${esc(s.url)}</small></li>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
body{font-family:Helvetica,Arial,sans-serif;color:#1b2430;padding:28px}
h1{font-size:20px;margin:0 0 4px;color:#0b4f6c}.sub{color:#6b7785;font-size:12px;margin-bottom:18px}
table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;width:34%;background:#f1f5f8;padding:7px;border:1px solid #dde4ea}
td{padding:7px;border:1px solid #dde4ea}h2{font-size:14px;margin-top:22px;color:#0b4f6c}li{font-size:12px;margin-bottom:6px}
.n{font-size:10px;color:#8a95a1;margin-top:24px}</style></head><body>
<h1>${esc(titreFiche(f))}</h1><div class="sub">${f.kind === 'societe' ? 'Fiche société' : 'Fiche professionnel'} · ${date}</div>
<table>${rows}</table><h2>Sources</h2><ul>${src}</ul>
<div class="n">Informations issues de sources publiques en ligne, à vérifier auprès du registre ou de l'ordre compétent.</div>
</body></html>`;
}

export async function exporterPdf(f: Fiche) {
  const html = ficheEnHtml(f);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: titreFiche(f), UTI: 'com.adobe.pdf' });
  }
}

export async function partagerTexte(f: Fiche) {
  const message = ficheEnTexte(f);
  if (Platform.OS === 'web') {
    const nav: any = (globalThis as any).navigator;
    if (nav?.share) return nav.share({ title: titreFiche(f), text: message });
    if (nav?.clipboard) return nav.clipboard.writeText(message);
    return;
  }
  await Share.share({ message, title: titreFiche(f) });
}
