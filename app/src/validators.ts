export type ModeSociete = 'ice' | 'rc' | 'if' | 'nom' | 'tel' | 'adresse';

export const MODES_SOCIETE: { id: ModeSociete; label: string; placeholder: string }[] = [
  { id: 'ice', label: 'ICE', placeholder: '15 chiffres, ex. 002667865000039' },
  { id: 'rc', label: 'RC', placeholder: 'N° RC, ex. 481331' },
  { id: 'if', label: 'IF', placeholder: 'Identifiant fiscal' },
  { id: 'nom', label: 'Raison sociale', placeholder: 'Nom ou enseigne' },
  { id: 'tel', label: 'Téléphone', placeholder: 'ex. 05 20 73 10 40' },
  { id: 'adresse', label: 'Adresse', placeholder: 'Rue, quartier, ville' },
];

const chiffres = (s: string) => s.replace(/\D/g, '');

export function valider(mode: ModeSociete, valeur: string): string | null {
  const v = valeur.trim();
  if (!v) return 'Saisissez une valeur.';
  switch (mode) {
    case 'ice':
      return chiffres(v).length === 15 ? null : "L'ICE comporte 15 chiffres.";
    case 'rc':
      return /^\d{1,7}$/.test(chiffres(v)) ? null : 'Le RC est un numéro (1 à 7 chiffres).';
    case 'if':
      return /^\d{6,9}$/.test(chiffres(v)) ? null : "L'IF comporte en général 7 à 8 chiffres.";
    case 'tel':
      return chiffres(v).length >= 6 ? null : 'Numéro trop court.';
    default:
      return v.length >= 2 ? null : 'Saisie trop courte.';
  }
}

export function normaliser(mode: ModeSociete, valeur: string): string {
  return ['ice', 'rc', 'if'].includes(mode) ? chiffres(valeur) : valeur.trim();
}
