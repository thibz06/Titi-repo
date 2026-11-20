# Décisions techniques

Un paragraphe par choix. Versions relevées sur le registre npm le 20 novembre 2026.

## Versions installées (phase 0)

| Paquet | Version |
| --- | --- |
| next | 16.4.6 |
| react | 19.3.1 |
| react-dom | 19.3.1 |
| @playwright/test | 1.63.0 |
| @tailwindcss/postcss | 4.3.5 |
| @types/node | 22.20.5 |
| @types/react | 19.3.0 |
| @types/react-dom | 19.3.0 |
| eslint | 9.39.5 |
| eslint-config-next | 16.4.6 |
| postcss | 8.5.33 |
| tailwindcss | 4.3.5 |
| typescript | 6.0.3 |
| vitest | 5.1.1 |

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
Fichiers `messages/<langue>.json` lus par un petit module typé (`src/i18n`). Pas de bibliothèque d'i18n tant qu'il n'y a qu'une langue et pas de pluriels ; le choix (next-intl probable) sera tranché en phase 1 et noté ici.

## PWA
Phase 0 : manifeste seul (`src/app/manifest.ts`) et icônes. Le service worker (Serwist), qui rend l'app réellement installable et hors-ligne, arrive en phase 1 comme prévu au brief.

## Icône
Icône provisoire dessinée pour le projet (tampon de passeport, losange lagon), source `public/icons/icon.svg`, PNG générés par `pnpm icons`. À remplacer si Thibault fournit un logo.

## Indexation
`robots: noindex` : le lien se partage, mais l'app n'a pas vocation à sortir dans les moteurs de recherche pour l'instant. À retirer sur demande.

## Tests
Vitest pour l'unitaire. Playwright épinglé en 1.63.0 pour correspondre au Chromium préinstallé de l'environnement de développement ; viewport 390 × 844.

## Déploiement
Vercel, branché sur le dépôt GitHub. La branche par défaut du dépôt s'appelle `Principal` : c'est la branche de production à déclarer dans Vercel. Le déploiement lui-même doit être fait depuis le compte Vercel de Thibault (pas d'accès Vercel depuis la session de développement).

## Questions ouvertes
- Source du taux roupie / euro (`EXCHANGE_RATE_API_URL`) : à proposer et vérifier en phase 1.
- Matrice de trajets : OSRM ou openrouteservice, à trancher en phase 2.
- Skills optionnels (find-skills) : aucun installé à ce stade.
