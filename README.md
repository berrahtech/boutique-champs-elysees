# Les Champs Élysées — plateforme e-commerce

Monorepo de la boutique en ligne LCE (Bamako, paiements en FCFA, Orange Money et Moov Money).

| Dossier | Contenu | Techno |
| --- | --- | --- |
| `apps/boutique` | Site client, rendu serveur (SSR) | Angular 22 |
| `apps/admin` | Administration | Angular 22 |
| `apps/api` | API REST `/api/v1`, base de données | NestJS 11, Prisma 7, PostgreSQL 16, Redis 7 |
| `libs/ui` | Composants Angular partagés | Angular |
| `libs/design-tokens` | Jetons de design et icônes : **source unique** | JSON → CSS, TS, Dart |
| `mobile/lce_ui` | Thème et composants Flutter partagés | Flutter 3.35 |
| `mobile/client`, `mobile/livreur` | Applications mobiles | Flutter 3.35 |
| `tools/` | Générateur de jetons, conversion du schéma Prisma | Node |

## Prérequis

- **Node 24** (Angular 22 refuse Node 22.18 et antérieurs) : voir `.nvmrc`.
- **Docker Desktop**, pour PostgreSQL et Redis en local.
- **Flutter 3.35**, pour les applications mobiles.

## Démarrer

```bash
npm ci
npm run services          # PostgreSQL (port 5433) et Redis (port 6380)
cp apps/api/.env.example apps/api/.env
```

Remplacer ensuite `JWT_SECRET` et `OTP_POIVRE` dans `apps/api/.env` par des valeurs aléatoires :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

```bash
npm run migrer            # applique les migrations SQL
npm run api               # http://localhost:3000/api/v1
npm run boutique          # http://localhost:4200
npm run admin             # http://localhost:4300/admin
```

En développement, les codes SMS s'affichent dans les journaux de l'API (`SMS_PASSERELLE=console`, interdit en production).

## Vérifier

```bash
npm test                  # tests web et API
npx nx run-many -t lint
npm run build
cd mobile/lce_ui && flutter analyze && flutter test
```

La CI (`.github/workflows/ci.yml`) lance tout cela, et vérifie aussi que les migrations s'appliquent sur une base vide et que les jetons générés sont à jour.

## Règles de travail

**Jetons de design.** On ne modifie que `libs/design-tokens/src/jetons.json` et `icones.json`, puis :

```bash
npm run jetons
```

Cette commande régénère les variables CSS, les constantes TypeScript et Dart, et les icônes. Aucune couleur n'est saisie en dur dans un composant. Un test vérifie le contraste 4,5:1 des couples texte / fond.

**Base de données : le SQL est la source de vérité.** Chaque évolution du schéma est une nouvelle migration SQL écrite à la main dans `apps/api/prisma/migrations/<horodatage>_<nom>/migration.sql`. Ensuite :

```bash
npx nx run api:prisma-schema
```

Cette commande applique la migration, relit la base, convertit les noms (`commande` → `Commande`, `sous_total` → `sousTotal`) et régénère le client Prisma.

Les règles critiques sont tenues par la base elle-même, même si le code a un bug :
- total cohérent ;
- un seul paiement réussi par commande ;
- une seule mission de livraison active ;
- stock jamais négatif ;
- journal d'audit en ajout seul.

`prisma migrate dev` n'est pas utilisé : il ne connaît pas ces contraintes et proposerait de les supprimer.

**Erreurs de l'API.** Toutes les erreurs suivent le format RFC 9457 (`application/problem+json`). Les clients se fient au champ `type` (`/problemes/otp-invalide`…), jamais au texte.

**Droits.** Toute route exige une connexion, sauf celles marquées `@Public()`. Une action réservée porte `@Permission('commande.affecter')`. Masquer un lien dans l'interface ne protège rien : c'est l'API qui décide.

## Identité (lot 0)

| Route | Rôle |
| --- | --- |
| `POST /auth/otp` | envoie un code SMS (6 chiffres, 5 min, 3 essais, 60 s entre deux envois, 5 par heure) |
| `POST /auth/otp/verifier` | vérifie le code, renvoie une preuve à usage unique (10 min) |
| `POST /auth/inscription` | crée le compte client avec la preuve |
| `POST /auth/connexion` | téléphone + mot de passe (+ code SMS si double authentification) ; 5 échecs = 15 min de blocage |
| `POST /auth/rafraichir` | rotation du jeton de session (30 jours) ; un jeton réutilisé ferme toutes les sessions |
| `POST /auth/deconnexion` | ferme la session |
| `POST /auth/mot-de-passe/reinitialiser` | nouveau mot de passe avec une preuve SMS ; ferme toutes les sessions |
| `GET /moi` | profil et permissions de l'utilisateur connecté |
| `GET /sante` | sonde de supervision |

## À fournir ou à décider

- **Logo :** le logo officiel est à déposer dans `apps/*/public/logo-lce-fond-sombre.svg`. Le fichier actuel est un logo texte provisoire.
- **Icônes :** les 50 icônes SVG du design system remplaceront les tracés provisoires de `libs/design-tokens/src/icones.json`, en gardant les mêmes noms.
- **Polices :** les fichiers `.ttf` de Playfair Display et Montserrat sont à placer dans `mobile/lce_ui/fonts`. Voir `pubspec.yaml`.
- **SMS :** le prestataire (Orange, Moov ou un agrégateur) reste à choisir. Il faudra une implémentation de `PasserelleSms`.
- **Rubriques :** les 10 rubriques de l'espace client et les 8 catégories sont à confronter aux maquettes.
