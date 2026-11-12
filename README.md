# Annuaire Pro Maroc

Application autonome (Android, iOS, PC via navigateur ou web installable) de recherche :
- **Sociétés** : par ICE, RC (+ tribunal), IF, raison sociale, téléphone, adresse, ou par **photo d'un ticket / d'une facture** (lecture automatique de l'ICE).
- **Professionnels** : médecins, dentistes, pharmaciens, avocats, notaires, adoul, huissiers, experts-comptables, comptables agréés, architectes, géomètres (nom, spécialité, ville, n° d'inscription). Données professionnelles uniquement.

Fiches avec sources, favoris, historique, export PDF, partage.

## Fonctionnement

Aucun serveur. L'application appelle directement l'API Claude (outil de recherche web) depuis l'appareil, en restreignant la recherche aux annuaires listés dans `src/sources.ts`. La clé API est saisie dans **Réglages** et reste sur l'appareil.

Option « Élargir à tout le web » : supprime la restriction aux annuaires.

## Lancer

```bash
cd app
npm install
npx expo start          # mobile via Expo Go (QR code) ou web (touche w)
npm run build:web       # version PC -> dossier dist/ (à héberger sur Vercel, Netlify ou tout serveur statique)
```

Version web déjà compilée : `app/dist/` (déposer le dossier sur Vercel ou Netlify ; sur PC, l'app peut ensuite être « installée » depuis Chrome/Edge).

APK Android :
```bash
npm i -g eas-cli && eas login
eas build -p android --profile preview
```

## Configuration

| Fichier | Rôle |
|---|---|
| `src/sources.ts` | Domaines interrogés (sociétés, chaque profession), tribunaux, modèle par défaut |
| `src/engine.ts` | Moteur : appel API, consignes, extraction JSON, lecture de document |
| Réglages (dans l'app) | Clé API, modèle, domaines supplémentaires |

Certains domaines de `sources.ts` sont à confirmer à l'usage (welipro.com, kerix.net, avocat.ma, med.ma) : un domaine sans résultat est simplement ignoré.

## Limites

- Informations issues de sources publiques : pour un usage officiel, vérifier auprès de l'OMPIC ou de l'ordre compétent.
- Dirigeants et comptes annuels : souvent payants sur les plateformes, renvoyés vers la source.
- Coût : chaque recherche consomme des crédits API (recherche web + modèle).
