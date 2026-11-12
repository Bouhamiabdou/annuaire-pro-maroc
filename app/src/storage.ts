import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entree, Fiche, titreFiche } from './types';
import { MODELE_PAR_DEFAUT } from './sources';

const K = {
  apiKey: 'ap.apiKey',
  model: 'ap.model',
  extra: 'ap.extraDomains',
  history: 'ap.history',
  favs: 'ap.favorites',
};

export type Reglages = { apiKey: string; model: string; extraDomains: string[] };

export async function lireReglages(): Promise<Reglages> {
  const [apiKey, model, extra] = await Promise.all([
    AsyncStorage.getItem(K.apiKey),
    AsyncStorage.getItem(K.model),
    AsyncStorage.getItem(K.extra),
  ]);
  return {
    apiKey: apiKey ?? '',
    model: model || MODELE_PAR_DEFAUT,
    extraDomains: extra ? JSON.parse(extra) : [],
  };
}

export async function ecrireReglages(r: Reglages) {
  await AsyncStorage.multiSet([
    [K.apiKey, r.apiKey.trim()],
    [K.model, r.model.trim() || MODELE_PAR_DEFAUT],
    [K.extra, JSON.stringify(r.extraDomains)],
  ]);
}

async function lireListe(key: string): Promise<Entree[]> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

const cle = (f: Fiche) =>
  f.kind === 'societe'
    ? `s:${f.ice || f.rc || titreFiche(f)}`.toLowerCase()
    : `p:${f.numero_inscription || titreFiche(f)}:${f.ville ?? ''}`.toLowerCase();

export async function ajouterHistorique(requete: string, fiches: Fiche[]) {
  const liste = await lireListe(K.history);
  const now = new Date().toISOString();
  const nouvelles: Entree[] = fiches.map((fiche, i) => ({ id: `${Date.now()}-${i}`, date: now, requete, fiche }));
  const filtrees = liste.filter(e => !fiches.some(f => cle(f) === cle(e.fiche)));
  await AsyncStorage.setItem(K.history, JSON.stringify([...nouvelles, ...filtrees].slice(0, 200)));
}

export const lireHistorique = () => lireListe(K.history);
export const lireFavoris = () => lireListe(K.favs);

export async function viderHistorique() {
  await AsyncStorage.removeItem(K.history);
}

export async function estFavori(f: Fiche) {
  return (await lireFavoris()).some(e => cle(e.fiche) === cle(f));
}

export async function basculerFavori(f: Fiche): Promise<boolean> {
  const liste = await lireFavoris();
  const existe = liste.some(e => cle(e.fiche) === cle(f));
  const maj = existe
    ? liste.filter(e => cle(e.fiche) !== cle(f))
    : [{ id: `${Date.now()}`, date: new Date().toISOString(), requete: titreFiche(f), fiche: f }, ...liste];
  await AsyncStorage.setItem(K.favs, JSON.stringify(maj));
  return !existe;
}
