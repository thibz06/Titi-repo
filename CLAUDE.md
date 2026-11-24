# Mauritius Quest

PWA de découverte de l'île Maurice : guide éditorial vérifié sur une carte, avec progression ludique.
Décision de Thibault (21 novembre 2026) : tout doit être gratuit et sans compte. Pas de Supabase, pas d'API Google payante. Fiches lues depuis `content/places`, données personnelles sur l'appareil, carte MapLibre + OpenFreeMap. Détails dans `docs/DECISIONS.md`.
Utilisée sur place du 21 décembre 2026 au 7 janvier 2027. Ce n'est pas une maquette : chaque bouton fait ce qu'il annonce, ou n'existe pas.

Le brief complet fait foi. Choix techniques et versions : `docs/DECISIONS.md`.

## Façon de travailler
- Avancer phase par phase. En fin de phase : lancer les tests, lister ce qui est livré et ce qui ne l'est pas, attendre la validation de Thibault.
- S'il manque une information (clé, donnée, choix produit) : poser la question. Ne jamais combler un trou par une invention.
- La phase 5 ne commence pas sans Thibault.
- Ordre de coupe si le calendrier glisse : séjour entier (garder une journée), trois variantes (garder Équilibré), carte illustrée (anneaux), collections. Ne jamais couper : sources et dates, check-in, hors-ligne.

## Règles non négociables
1. Aucune donnée inventée : note, prix, horaire, vidéo, temps de trajet, légende. Un champ inconnu vaut `null` et s'affiche « Non renseigné ».
2. Toute fiche a au moins une source (URL + date de consultation), affichée en bas de fiche. Décisions de Thibault : les fiches sourcées sont visibles sans vérification préalable (21 novembre 2026) et sans bandeau d'avertissement (24 novembre 2026). La mention « Fiche vérifiée le … » n'apparaît que si `status: "published"` avec `verified_at` et `verified_by`, sur demande explicite de Thibault. Claude n'écrit jamais qu'une fiche est vérifiée de son propre chef.
3. Rien ne vient de Google : ni coordonnées, ni notes, ni avis, ni horaires, ni photos. Seul le lien « Y aller » ouvre Google Maps.
4. Aucune clé secrète côté client. Aujourd'hui l'app n'a besoin d'aucune clé.
5. Pas de base de données pour l'instant. Si une base revient : RLS activée et testée sur toutes les tables (la migration et ses tests sont conservés).
6. Une prévision météo ou un temps de trajet est toujours présenté comme une estimation, avec sa source et son heure de calcul.
7. Gamification sans pression : pas de série punitive, pas de compte à rebours, notifications désactivées par défaut, aucun bonus d'XP lié au danger.
8. Mobile d'abord (390 px), une main, plein soleil : contraste AA, zones tactiles de 44 px minimum, `prefers-reduced-motion` respecté.
9. Interface en français, tutoiement, textes dans `messages/*.json` (structure prête pour l'anglais). Aucun texte d'interface en dur dans les composants.
10. Photos : uniquement des fichiers sous licence libre dont l'auteur, la licence et la page d'origine sont enregistrés dans la fiche et affichés (Wikimedia Commons, Flickr en Creative Commons via Openverse, photos de Thibault). Jamais d'image prise sur Google Images ou sur un site sans licence. À défaut, aplat à la couleur de la famille du lieu.
11. Le programme généré est une proposition modifiable. L'app ne réserve rien.

## Design
Style « été » voulu par Thibault (24 novembre 2026) : épuré, lumineux, presque futuriste, qui donne envie de soleil. Référence : grandes photos aux coins très arrondis, beaucoup de blanc, pastilles.
- Tokens dans `src/app/globals.css` : fond `brume` (blanc chaud), `encre` pour le texte, `braise` pour les liens et sur-titres, `lagon`, `soleil`, `corail`, `filao` ; Île secrète : `basalte`, `or`.
- Actions principales : dégradé soleil → corail (`bg-sun`), texte Encre. Sélection (onglet, filtre actif) : dégradé turquoise (`bg-lagoon`), texte Encre. Jamais de texte blanc sur ces dégradés (contraste AA).
- Cartes blanches très arrondies sans bordure (`.glass`) ; `.frost` (blanc translucide flouté) pour ce qui flotte sur une photo ou la carte ; texte blanc sur photo uniquement par-dessus `.photo-scrim`.
- Titres en Sora (`font-display`), texte en Inter.
- Ne pas copier Duolingo ; le tampon de passeport reste le motif de récompense.
- Transitions de 200 à 300 ms ; récompense de 1,2 s maximum et passable ; confettis pour badges et niveaux seulement.

## Commandes
- `pnpm dev` : serveur de développement
- `pnpm build` puis `pnpm start` : production locale
- `pnpm lint` et `pnpm typecheck`
- `pnpm test` : Vitest (`tests/unit`, et `tests/rls` qui rejoue la migration dans un Postgres en mémoire)
- `pnpm test:e2e` : build puis Playwright, viewport mobile 390 px (`tests/e2e`), avec les fiches fictives de `tests/fixtures/places` et un fond de carte simulé
- `pnpm icons` : régénère les PNG du manifeste depuis `public/icons/icon.svg`
- `pnpm content:lint` : contrôle des fiches (schéma, sources, coordonnées)
- `pnpm photos:find` : cherche sur Openverse des photos libres pour les fiches qui en manquent et les copie dans `public/photos`
- `pnpm photos:fetch` : copie dans `public/photos` les photos Commons citées par les fiches (lent, à relancer après ajout de photos)
- `pnpm matrix:build` : recalcule `content/travel-times.json` avec OSRM ; à relancer après tout ajout de fiche

## Structure
- `src/app` : routes Next.js (App Router) ; `src/components` : écrans et composants
- `src/lib` : formats des fiches, favoris sur l'appareil
- `src/content` : schéma des fiches et lecture à la compilation
- `src/i18n` et `messages/` : textes
- `supabase/migrations` : schéma SQL et RLS, conservé mais non utilisé par l'app
- `content/places` : fiches (règles dans `content/README.md`)
- `docs/DECISIONS.md` : un paragraphe par choix technique, à tenir à jour à chaque ajout de dépendance

## Progression
Règles dans `src/lib/progress/rules.ts` (XP par famille, multiplicateur de rareté, niveaux, rayon de check-in, trois validations manuelles par jour). Favoris et visites sont stockés sur l'appareil (`src/lib/store.ts`).

## Planificateur
Moteur pur dans `src/lib/planner` (tests de propriétés : jamais d'étape fermée, budget et conduite tenus, étapes verrouillées immobiles). Ne jamais deviner un prix, un horaire ou une durée : signaler l'inconnue.

## Onglets
N'afficher que les onglets qui fonctionnent. Quêtes s'ajoutera avec sa phase.

## Git
Développement sur la branche indiquée par la session ; pas de pull request sans demande explicite. La branche principale du dépôt s'appelle `Principal` ; c'est elle que la production Vercel doit suivre.
