import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entree, Fiche, titreFiche } from './types';

const K = {
  history: 'ap.history',
  favs: 'ap.favorites',
};

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
