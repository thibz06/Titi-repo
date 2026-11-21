# Décisions techniques

Un paragraphe par choix. Versions relevées sur le registre npm le 20 novembre 2026.

## Versions installées

| Paquet | Version |
| --- | --- |
| @electric-sql/pglite | 0.5.17 |
| @electric-sql/pglite-postgis | 0.2.17 |
| @googlemaps/markerclusterer | 2.6.2 |
| @playwright/test | 1.63.0 |
| @serwist/turbopack | 9.5.15 |
| @supabase/ssr | 0.12.7 |
| @supabase/supabase-js | 2.119.2 |
| @tailwindcss/postcss | 4.3.5 |
| @tanstack/react-query | 5.108.2 |
| @types/google.maps | 3.67.0 |
| @types/node | 22.20.5 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| @vis.gl/react-google-maps | 1.10.2 |
| esbuild | 0.28.2 |
| eslint | 9.39.5 |
| eslint-config-next | 16.4.6 |
| lucide-react | 1.77.0 |
| motion | 14.14.0 |
| next | 16.4.6 |
| postcss | 8.5.33 |
| react | 19.3.1 |
| react-dom | 19.3.1 |
| serwist | 9.5.15 |
| tailwindcss | 4.3.5 |
| typescript | 6.0.3 |
| vitest | 5.1.1 |
| zod | 4.6.7 |

Node 22.23 et pnpm 10.28 en développement ; `engines.node >= 22.20`.

## Next.js 16 (App Router)
Dernière version stable. La page d'accueil et le manifeste sont rendus en statique : aucune clé ni variable d'environnement n'est nécessaire en phase 0.

## TypeScript 6.0 plutôt que 7.0
TypeScript 7.0.2 est la dernière version stable, mais typescript-eslint (utilisé par eslint-config-next) déclare ne supporter que les versions inférieures à 6.1. On reste sur 6.0.3, en mode strict avec `noUncheckedIndexedAccess`. À réévaluer quand l'outillage de lint suivra.

## ESLint 9 plutôt que 10
ESLint 10 est sorti, mais les plugins embarqués par eslint-config-next 16.4.6 (import, react, jsx-a11y) ne déclarent leur compatibilité que jusqu'à la version 9. npm signale ESLint 9 comme n'étant plus maintenu : à remonter dès que eslint-config-next le permet.

## Tailwind CSS 4
Configuration en CSS : les couleurs et polices de la direction « Lagon et basalte » sont déclarées dans `@theme` (`src/app/globals.css`) et donnent les classes `bg-lagon`, `text-encre`, `font-display`, etc. Un test Vitest vérifie le contraste AA des paires de couleurs utilisées.

## Polices
Fraunces et Inter via `next/font/google` : fichiers téléchargés à la compilation et servis depuis notre domaine, aucun appel à Google depuis le téléphone.

## Textes d'interface
Fichiers `messages/<langue>.json` lus par un petit module typé (`src/i18n`), avec remplacement de variables. Pas de bibliothèque d'i18n tant qu'il n'y a qu'une langue ; à réévaluer quand l'anglais arrivera (phase 5).

## PWA et service worker
Manifeste (`src/app/manifest.ts`), icônes, et service worker Serwist. Next.js 16 compile avec Turbopack, que le plugin `@serwist/next` (webpack) ne gère pas : on utilise `@serwist/turbopack`, qui sert le worker depuis une route (`/serwist/sw.js`) et le compile avec esbuild. Le worker met en cache les pages et fichiers statiques ; les données Supabase hors-ligne (Dexie, packs par région) restent prévues en phase 2.

## Icône
Icône provisoire dessinée pour le projet (tampon de passeport, losange lagon), source `public/icons/icon.svg`, PNG générés par `pnpm icons`. À remplacer si Thibault fournit un logo.

## Indexation
`robots: noindex` : le lien se partage, mais l'app n'a pas vocation à sortir dans les moteurs de recherche pour l'instant. À retirer sur demande.

## Tests
Vitest pour l'unitaire. Playwright épinglé en 1.63.0 pour correspondre au Chromium préinstallé de l'environnement de développement ; viewport 390 × 844.

## Déploiement
Vercel, branché sur le dépôt GitHub. La branche par défaut du dépôt s'appelle `Principal` : c'est la branche de production à déclarer dans Vercel. Le déploiement lui-même doit être fait depuis le compte Vercel de Thibault (pas d'accès Vercel depuis la session de développement).

## Base de données
Une migration SQL (`supabase/migrations`) crée tout le modèle du brief dès la phase 1, RLS activée partout. Écarts assumés par rapport à la liste du brief :
- `places` stocke `lat` et `lng` ; `geog` (PostGIS) est une colonne générée à partir d'eux. Plus simple à saisir et à lire côté client, et une contrainte refuse toute coordonnée hors de l'île.
- Les règles 2 et 6.3 sont dans la base, pas seulement dans l'app : un déclencheur refuse la publication sans date de vérification, sans source, ou (Île secrète) sans accès légal vérifié.
- Le rôle `editor` est dans `profiles.role`. Un utilisateur ne peut pas modifier son propre rôle (droit de colonne) ; on le donne à la main dans Supabase.
- `xp_events` et `user_badges` sont en lecture seule côté client : l'attribution passera par des fonctions serveur en phase 3, pour qu'on ne puisse pas se créditer soi-même.
- `regions.polygon` est vide tant qu'aucun tracé sourcé n'est fourni.

## Tests RLS
Les règles sont testées contre un vrai Postgres en mémoire (PGlite + PostGIS) qui rejoue la migration, avec un mini-schéma `auth` imitant Supabase (`tests/rls/harness.ts`). Pas besoin de Docker ni de projet Supabase pour les lancer. Limite : ce n'est pas Supabase lui-même ; un contrôle sur le vrai projet reste à faire une fois les clés fournies.

## Lecture des données côté navigateur
Les fiches sont lues depuis le navigateur avec la clé anonyme (TanStack Query), pas rendues côté serveur. C'est ce qui permettra de les servir depuis IndexedDB hors-ligne en phase 2, et la RLS garantit que seules les fiches publiées sortent.

## Carte
`@vis.gl/react-google-maps` avec marqueurs avancés (d'où le Map ID obligatoire) et `@googlemaps/markerclusterer`. Chaque famille a une forme et une couleur ; les teintes hors palette (bleu clair, vert clair, corail clair, jaune clair) sont des éclaircissements choisis pour garder un contraste AA avec l'icône Encre. Sans clé, hors-ligne ou en cas d'échec de chargement, l'écran le dit et la liste reste utilisable.

## Style « verre » et photos en fond
À la demande de Thibault (21 novembre 2026) : la photo du lieu occupe tout l'écran de la fiche et les contenus sont posés dessus dans des panneaux translucides floutés, façon Liquid Glass. Les couleurs et polices « Lagon et basalte » restent. Pour tenir la règle du contraste AA en plein soleil, le verre garde une teinte Sable opaque à 70 % au moins (84 % pour les barres), ce qui laisse le texte Encre lisible même sur une photo sombre ; il devient opaque si l'appareil demande moins de transparence ou ne gère pas le flou. Sans photo créditée (règle 10), le fond est un dégradé aux couleurs du projet avec la pastille de la famille.

## Onglets
Le brief prévoit cinq onglets. Seuls ceux qui fonctionnent sont affichés (Accueil, Explorer, Profil) ; Quêtes et Mon voyage apparaîtront avec leurs phases, pour ne montrer aucun bouton vide.

## Brouillons de fiches
Un JSON par lieu dans `content/places`, validé par un schéma zod (`src/content/schema.ts`) et un test : coordonnées dans l'île, au moins une source avec extrait, aucun lien Google Maps, chaque prix/horaire/durée/difficulté couvert par une source dédiée. `interest` et `xp_base` restent vides : ce sont des décisions d'éditeur.

## Questions ouvertes
- Quelle famille vaut 10, 20 ou 30 XP ? Le brief donne les trois valeurs sans la répartition.
- Tracé des 8 régions : quelle source (districts OpenStreetMap regroupés ?) ou dessin fourni par Thibault.
- Source du taux roupie / euro (`EXCHANGE_RATE_API_URL`) : à proposer et vérifier en phase 1.
- Matrice de trajets : OSRM ou openrouteservice, à trancher en phase 2.
- Skills optionnels (find-skills) : aucun installé à ce stade.
