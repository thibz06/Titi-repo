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
Thibault a demandé de prendre les photos sur Google Images. Non retenu : ces images appartiennent à leurs auteurs, et les copier sur un site public exposerait Thibault à des réclamations ; Google bloque par ailleurs les robots. À la place, `pnpm photos:find` interroge Openverse (catalogue d'images Creative Commons : Flickr, Wikimedia Commons…) et ne retient une photo que si son titre ou ses mots-clés nomment le lieu. Licences acceptées : CC0, domaine public, BY, BY-SA, BY-NC, BY-NC-SA (pas de « ND », l'app recadre). Auteur, licence et page d'origine sont enregistrés dans la fiche et affichés. C'est un élargissement de la règle de départ (Wikimedia Commons et photos de Thibault). Les photos sont copiées dans `public/photos` (`storage_path`) : affichage fiable et hors-ligne. `pnpm photos:fetch` fait la même copie pour les photos Commons déjà citées. Jusqu'à trois photos par fiche ; sans photo, aplat à la couleur de la famille.

## Style « été » (24 novembre 2026)
Historique : le premier style (« Lagon et basalte », sable et bleu) puis le « verre » n'ont pas plu ; Thibault a fourni une référence (grandes photos très arrondies, interface claire et épurée) puis demandé des couleurs chaudes et estivales, « presque futuriste ». État actuel : fond blanc chaud, cartes blanches sans bordure, actions en dégradé soleil → corail, sélection en turquoise, titres en Sora à la place de Fraunces. Le texte reste Encre sur les dégradés pour tenir le contraste AA. Photo du lieu en en-tête de fiche, carrousel de grandes cartes photo sur l'accueil ; sans photo, aplat à la couleur de la famille.

## Bandeau de vérification retiré (24 novembre 2026)
À la demande de Thibault, les fiches n'affichent plus « Fiche pas encore vérifiée sur place ». Les sources et leur date de consultation restent en bas de fiche, et « Non renseigné » reste affiché pour tout champ inconnu. Conséquence assumée : rien ne distingue plus visuellement une fiche vérifiée d'une fiche seulement sourcée, sauf la ligne « Fiche vérifiée le … » quand elle existe.

## TikTok
Un seul lien en bas de fiche, vers `tiktok.com/discover/<mots-clés>` (nom court du lieu + « mauritius »). Raison : le fichier d'association de TikTok (`apple-app-site-association`, lu le 24 novembre 2026) montre que l'app iPhone ouvre les adresses `/discover/*` et `/tag/*`, mais pas `/search`, qui restait dans Safari sans remplir la recherche. Le lien par mot-dièse, essayé entre-temps, ouvrait bien l'app mais ne faisait pas une recherche classique. Comportement réel à confirmer sur le téléphone de Thibault.

## Mise à jour de l'app sur le téléphone
Le service worker gardait l'ancienne version affichée. L'app vérifie maintenant s'il existe une version plus récente à chaque ouverture et se recharge une fois quand elle prend la main.

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
