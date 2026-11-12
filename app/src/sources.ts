// Sources interrogées par le moteur. Modifiables dans Réglages (domaines supplémentaires).

export const SOURCES_SOCIETES: string[] = [
  'bt-africa.com',
  'charika.ma',
  'welipro.com',
  'directinfo.ma',
  'ice.gov.ma',
  'fiscamaroc.com',
  'annuaire-gratuit.ma',
  'kerix.net',
];

export type Profession = {
  id: string;
  label: string;
  sources: string[];
};

export const PROFESSIONS: Profession[] = [
  { id: 'medecin', label: 'Médecin', sources: ['dabadoc.com', 'med.ma', 'annuaire-gratuit.ma'] },
  { id: 'dentiste', label: 'Chirurgien-dentiste', sources: ['dabadoc.com', 'med.ma', 'annuaire-gratuit.ma'] },
  { id: 'pharmacien', label: 'Pharmacien', sources: ['pharmacie.ma', 'annuaire-gratuit.ma'] },
  { id: 'avocat', label: 'Avocat', sources: ['annuaire-gratuit.ma', 'avocat.ma'] },
  { id: 'notaire', label: 'Notaire', sources: ['notaires.org.ma', 'annuaire-gratuit.ma'] },
  { id: 'adoul', label: 'Adoul', sources: ['annuaire-gratuit.ma'] },
  { id: 'huissier', label: 'Huissier de justice', sources: ['annuaire-gratuit.ma'] },
  { id: 'expert-comptable', label: 'Expert-comptable', sources: ['oec.ma', 'fiscamaroc.com', 'annuaire-gratuit.ma'] },
  { id: 'comptable-agree', label: 'Comptable agréé', sources: ['opca.ma', 'fiscamaroc.com'] },
  { id: 'architecte', label: 'Architecte', sources: ['annuaire-gratuit.ma'] },
  { id: 'geometre', label: 'Géomètre-topographe', sources: ['annuaire-gratuit.ma'] },
];

export const TRIBUNAUX = [
  'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda',
  'Kénitra', 'El Jadida', 'Settat', 'Mohammedia', 'Tétouan', 'Laâyoune', 'Béni Mellal', 'Safi',
];

// Adresse du relais pour les versions mobiles (la version web utilise /api/claude).
export const API_BASE: string =
  (process.env.EXPO_PUBLIC_API_BASE as string | undefined) || 'https://annuaire-pro-maroc.vercel.app';
