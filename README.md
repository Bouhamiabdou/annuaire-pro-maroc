# Annuaire Pro Maroc

Application autonome (Android, iOS, PC via navigateur ou web installable) de recherche :
- **Sociétés** : par ICE, RC (+ tribunal), IF, raison sociale, téléphone, adresse, ou par **photo d'un ticket / d'une facture** (lecture automatique de l'ICE).
- **Professionnels** : médecins, dentistes, pharmaciens, avocats, notaires, adoul, huissiers, experts-comptables, comptables agréés, architectes, géomètres (nom, spécialité, ville, n° d'inscription). Données professionnelles uniquement.

Fiches avec sources, favoris, historique, export PDF, partage.

## Fonctionnement

L'application s'ouvre directement, sans aucune configuration. Les recherches passent par un relais
serverless Vercel (`app/api/claude.ts`) qui détient la clé API Claude et n'autorise que l'outil de
recherche web, restreint aux annuaires listés dans `src/sources.ts`.

Option « Élargir à tout le web » : supprime la restriction aux annuaires.

## Mise en ligne (une seule fois)

1. Projet Vercel relié au dépôt GitHub, **Root Directory = `app`** (le fichier `app/vercel.json` fixe la compilation).
2. Variable d'environnement Vercel : `ANTHROPIC_API_KEY` = votre clé (facultatif : `ANTHROPIC_MODEL`).
3. Déployer. Adresse : `https://annuaire-pro-maroc.vercel.app` (PC : ouvrir puis « Installer l'application » dans Chrome/Edge).

Versions mobiles : elles appellent `https://annuaire-pro-maroc.vercel.app/api/claude`
(autre adresse : variable `EXPO_PUBLIC_API_BASE` au moment du build).

```bash
cd app && npm install
npx expo start                     # test sur mobile via Expo Go
eas build -p android --profile preview   # APK Android
```

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `app/api/claude.ts` | Relais serveur (clé API, modèle, filtrage des outils) |
| `app/src/sources.ts` | Domaines interrogés, tribunaux, adresse du relais |
| `app/src/engine.ts` | Consignes de recherche, extraction des fiches, lecture de ticket |

Certains domaines de `sources.ts` sont à confirmer à l'usage (welipro.com, kerix.net, avocat.ma, med.ma) : un domaine sans résultat est simplement ignoré.

## Limites

- Informations issues de sources publiques : pour un usage officiel, vérifier auprès de l'OMPIC ou de l'ordre compétent.
- Dirigeants et comptes annuels : souvent payants sur les plateformes, renvoyés vers la source.
- Coût : chaque recherche consomme des crédits API (recherche web + modèle).
