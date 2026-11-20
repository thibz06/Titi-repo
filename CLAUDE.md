# Mauritius Quest

PWA de découverte de l'île Maurice : guide éditorial vérifié sur une carte Google, avec progression ludique.
Utilisée sur place du 21 décembre 2026 au 7 janvier 2027. Ce n'est pas une maquette : chaque bouton fait ce qu'il annonce, ou n'existe pas.

Le brief complet fait foi. Choix techniques et versions : `docs/DECISIONS.md`.

## Façon de travailler
- Avancer phase par phase. En fin de phase : lancer les tests, lister ce qui est livré et ce qui ne l'est pas, attendre la validation de Thibault.
- S'il manque une information (clé, donnée, choix produit) : poser la question. Ne jamais combler un trou par une invention.
- La phase 5 ne commence pas sans Thibault.
- Ordre de coupe si le calendrier glisse : séjour entier (garder une journée), trois variantes (garder Équilibré), carte illustrée (anneaux), collections. Ne jamais couper : sources et dates, check-in, hors-ligne.

## Règles non négociables
1. Aucune donnée inventée : note, prix, horaire, vidéo, temps de trajet, légende. Un champ inconnu vaut `null` et s'affiche « Non renseigné ».
2. Une fiche n'est publiée (`status = published`) que si elle a au moins une source (URL + date de consultation) et une date de vérification. Les fiches rédigées par Claude restent en `draft` ; seul Thibault publie.
3. Contenu Google : seul `google_place_id` est stocké. Note, avis, horaires et photos Google sont chargés à la demande, affichés avec attribution, jamais écrits en base ni réutilisés pour des synthèses. Les coordonnées des fiches ne viennent pas de Google.
4. Aucune clé secrète côté client. Clé Maps JS restreinte par référent HTTP et par API. Routes API, Places API et clé de service Supabase : serveur uniquement.
5. RLS activée et testée sur toutes les tables.
6. Une prévision météo ou un temps de trajet est toujours présenté comme une estimation, avec sa source et son heure de calcul.
7. Gamification sans pression : pas de série punitive, pas de compte à rebours, notifications désactivées par défaut, aucun bonus d'XP lié au danger.
8. Mobile d'abord (390 px), une main, plein soleil : contraste AA, zones tactiles de 44 px minimum, `prefers-reduced-motion` respecté.
9. Interface en français, tutoiement, textes dans `messages/*.json` (structure prête pour l'anglais). Aucun texte d'interface en dur dans les composants.
10. Photos : uniquement des fichiers dont la licence et le crédit sont enregistrés (Wikimedia Commons, photos de Thibault). À défaut, illustration de la famille du lieu.
11. Le programme généré est une proposition modifiable. L'app ne réserve rien.

## Design
Direction « Lagon et basalte », identité originale (ne pas copier Duolingo ; le tampon de passeport est le motif de récompense).
Tokens dans `src/app/globals.css` (`@theme`) : lagon, passe, sable, filao, corail, soleil, encre ; Île secrète : basalte, or.
Texte Encre sur Lagon, jamais blanc. Titres Fraunces (`font-display`), texte Inter.
Transitions de 200 à 300 ms ; récompense de 1,2 s maximum et passable ; confettis pour badges et niveaux seulement.

## Commandes
- `pnpm dev` : serveur de développement
- `pnpm build` puis `pnpm start` : production locale
- `pnpm lint` et `pnpm typecheck`
- `pnpm test` : Vitest (`tests/unit`, et `tests/rls` qui rejoue la migration dans un Postgres en mémoire)
- `pnpm test:e2e` : build puis Playwright, viewport mobile 390 px (`tests/e2e`), Supabase simulé
- `pnpm icons` : régénère les PNG du manifeste depuis `public/icons/icon.svg`
- À venir (phase 2) : `pnpm content:lint`, `pnpm content:push`, `pnpm matrix:build`

## Structure
- `src/app` : routes Next.js (App Router) ; `src/components` : écrans et composants
- `src/lib` : env, client Supabase, requêtes et formats des fiches
- `src/i18n` et `messages/` : textes
- `supabase/migrations` : schéma SQL et RLS
- `content/places` : brouillons de fiches (règles dans `content/README.md`), schéma dans `src/content/schema.ts`
- `docs/SETUP.md` : mise en place de Supabase, Google Maps et Vercel
- `docs/DECISIONS.md` : un paragraphe par choix technique, à tenir à jour à chaque ajout de dépendance

## Onglets
N'afficher que les onglets qui fonctionnent. Quêtes et Mon voyage s'ajoutent avec leurs phases.

## Git
Développement sur la branche indiquée par la session ; pas de pull request sans demande explicite. La branche principale du dépôt s'appelle `Principal` ; c'est elle que la production Vercel doit suivre.
