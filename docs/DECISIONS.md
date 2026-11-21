# Décisions techniques

Un paragraphe par choix. Versions relevées sur le registre npm le 20 novembre 2026.

## Versions installées

| Paquet | Version |
| --- | --- |
| @electric-sql/pglite | 0.5.17 |
| @electric-sql/pglite-postgis | 0.2.17 |
| @playwright/test | 1.63.0 |
| @serwist/turbopack | 9.5.15 |
| @tailwindcss/postcss | 4.3.5 |
| @types/node | 22.20.5 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| esbuild | 0.28.2 |
| eslint | 9.39.5 |
| eslint-config-next | 16.4.6 |
| lucide-react | 1.77.0 |
| maplibre-gl | 5.24.1 |
| motion | 14.14.0 |
| next | 16.4.6 |
| postcss | 8.5.33 |
| react | 19.3.1 |
| react-dom | 19.3.1 |
| server-only | 0.0.1 |
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

## Tout gratuit, sans compte : ni Supabase ni Google (21 novembre 2026)
Thibault n'a pas réussi à mettre en place Supabase et veut une app entièrement gratuite. L'architecture change donc par rapport au brief :
- **Fiches** : les JSON de `content/places` sont lus à la compilation ; les pages sont générées en statique. Pas de base de données.
- **Visibilité** (demande de Thibault : « la version finale avec les vrais lieux ») : toutes les fiches sourcées apparaissent dans Explorer. Tant qu'une fiche n'est pas vérifiée, elle porte l'avertissement « Fiche pas encore vérifiée sur place ». Elle le perd en passant en `published` avec `verified_at` et `verified_by`, ce que seul Thibault décide. C'est un assouplissement de la règle 2 du brief, qui réservait l'affichage aux fiches vérifiées.
- **Favoris** : enregistrés sur l'appareil (`localStorage`). Pas de compte ni de session. Limite : ils ne suivent pas d'un téléphone à l'autre.
- **Carte** : MapLibre GL avec le fond OpenFreeMap (données OpenStreetMap), gratuit, sans clé ni carte bancaire. MapLibre 5 plutôt que 6 : la v6 ne charge pas son worker avec Turbopack. Regroupement des marqueurs par la source GeoJSON de MapLibre.
- **« Y aller »** : reste un simple lien Google Maps (format Maps URLs), gratuit et sans clé.
- **Abandonné ou à remplacer** : note et avis Google en direct (API payante) ; Routes API, à remplacer par OSRM ou openrouteservice pour les temps de trajet ; lien magique et synchronisation entre appareils.
- **Conséquence pour la suite** : check-ins, XP, quêtes et journées seront stockés sur l'appareil (Dexie). La règle « RLS testée » n'a plus d'objet tant qu'il n'y a pas de base ; la migration SQL et ses tests restent dans le dépôt (`supabase/`, `tests/rls`) au cas où une base reviendrait, mais l'app ne s'en sert pas.

## Photos
Les fiches pointent vers le fichier Wikimedia Commons d'origine ; l'app charge une miniature à largeur standard (250, 500, 960 ou 1280 px) et retombe sur l'original, puis sur le fond dégradé, si le chargement échoue. À faire en phase 2 pour le hors-ligne : copier des versions compressées dans le dépôt, avec crédit et licence.

## Style « verre » et photos en fond
À la demande de Thibault (21 novembre 2026) : la photo du lieu occupe tout l'écran de la fiche et les contenus sont posés dessus dans des panneaux translucides floutés, façon Liquid Glass. Les couleurs et polices « Lagon et basalte » restent. Pour tenir la règle du contraste AA en plein soleil, le verre garde une teinte Sable opaque à 70 % au moins (84 % pour les barres), ce qui laisse le texte Encre lisible même sur une photo sombre ; il devient opaque si l'appareil demande moins de transparence ou ne gère pas le flou. Sans photo créditée (règle 10), le fond est un dégradé aux couleurs du projet avec la pastille de la famille.

## Onglets
Le brief prévoit cinq onglets. Seuls ceux qui fonctionnent sont affichés (Accueil, Explorer, Profil) ; Quêtes et Mon voyage apparaîtront avec leurs phases, pour ne montrer aucun bouton vide.

## Brouillons de fiches
Un JSON par lieu dans `content/places`, validé par un schéma zod (`src/content/schema.ts`) et un test : coordonnées dans l'île, au moins une source avec extrait, aucun lien Google Maps, chaque prix/horaire/durée/difficulté couvert par une source dédiée. `interest` et `xp_base` restent vides : ce sont des décisions d'éditeur.

## Progression (XP, niveaux, check-in)
Thibault a laissé le choix du barème. XP de base par famille : 10 pour plages, villages et marchés, tables ; 20 pour culture, nature et parcs, activités en mer, sport et loisirs ; 30 pour cascades et randonnées (l'effort, pas le danger). Multiplicateur de rareté 1 / 1,25 / 1,5 / 2, région complétée 100 XP, cinq niveaux aux seuils du brief. Le check-in GPS accepte un rayon par famille (200 à 800 m) plus l'imprécision du GPS plafonnée à 150 m ; hors rayon ou sans GPS, validation à la main, même XP, trois par jour. Tout est stocké sur l'appareil, donc fonctionne hors-ligne sans file d'attente. Limite assumée : sans serveur, rien n'empêche de tricher en modifiant le stockage du navigateur ; sans conséquence pour un usage familial.

## Planificateur
Moteur en fonctions pures (`src/lib/planner`), sans modèle de langage, déterministe à graine fixe, exécuté dans le navigateur (trois programmes de 18 jours en moins d'une seconde). Le programme est gardé sur l'appareil.
- **Temps de trajet** : matrice calculée par `pnpm matrix:build` avec le serveur public OSRM (données OpenStreetMap), gratuite et sans clé, stockée dans `content/travel-times.json` avec sa source et sa date. OSRM donne des temps sans trafic, optimistes pour Maurice : le planificateur les majore de 40 % (hypothèse de planification, affichée à l'utilisateur). À relancer quand des fiches sont ajoutées.
- **Vérification Routes API à l'ouverture d'une journée** : abandonnée avec Google. Pas d'équivalent gratuit avec trafic en temps réel.
- **Inconnues** : un prix, des horaires ou une durée non renseignés ne sont jamais devinés. Le lieu reste proposable, l'étape est signalée (« Prix non renseigné », « Horaires non renseignés : vérifie avant d'y aller », « Durée prévue par défaut »). Un prix inconnu ne compte pas dans le budget.
- **Jours fériés** : `content/calendar.json` (25 décembre 2026, 1er et 2 janvier 2027), d'après timeanddate.com, source secondaire à confirmer sur govmu.org. La bibliothèque `opening_hours` ne connaît pas les fériés mauriciens : la règle « PH » est traitée par notre code.
- **Taux roupie / euro** : `/api/rate` interroge open.er-api.com (gratuit, sans clé, couvre la roupie mauricienne, attribution demandée), cache de 12 h, gardé sur l'appareil avec sa date. Sans taux, le budget en euros n'est pas appliqué et l'app le dit.
- **Pas encore fait** : glisser-déposer (remplacé par des boutons monter/descendre), plusieurs versions enregistrées d'une journée, carte de l'itinéraire dans l'app (un lien ouvre l'itinéraire dans Google Maps), incontournables à imposer, météo.

## Sources de contenu
Wikipédia sert au contexte et aux coordonnées. Le contenu utile (quoi faire, prix, horaires) vient du site officiel du lieu ou du prestataire, des offices du tourisme, des organismes publics et de la presse mauricienne. GetYourGuide, Viator et consorts servent à repérer des activités ; on ne recopie ni leurs textes ni leurs notes, et ils refusent de toute façon les robots.

## Questions ouvertes
- Source gratuite du taux roupie / euro, à vérifier.
- Tracé des 8 régions : quelle source (districts OpenStreetMap regroupés ?) ou dessin fourni par Thibault.
- Source du taux roupie / euro (`EXCHANGE_RATE_API_URL`) : à proposer et vérifier en phase 1.
- Matrice de trajets : OSRM ou openrouteservice, à trancher en phase 2.
- Skills optionnels (find-skills) : aucun installé à ce stade.
