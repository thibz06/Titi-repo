# Mise en place (phase 1)

Trois services à brancher. Aucune clé ne doit être envoyée dans le chat ni commitée : elles se saisissent dans Vercel.

## 1. Supabase
1. Crée un projet sur supabase.com (région proche de Maurice ou de l'Europe, au choix).
2. Dans **SQL Editor**, colle et exécute le contenu de `supabase/migrations/20261120000100_init.sql`.
3. Dans **Authentication → Sign In / Providers**, active **Allow anonymous sign-ins**.
4. Dans **Project Settings → API**, relève l'URL du projet et la clé `anon` (publique). La clé `service_role` reste secrète : elle ne servira qu'aux scripts (phase 2).
5. Pour devenir éditeur : ouvre l'app une fois sur ton téléphone (ça crée ta session), puis dans **Table Editor → profiles**, passe ta ligne à `role = editor`.

## 2. Google Maps
1. Dans Google Cloud Console, crée un projet et active **Maps JavaScript API**.
2. Crée une clé **navigateur** : restriction « Sites web » sur l'URL Vercel de l'app (`https://ton-app.vercel.app/*`), restriction d'API sur Maps JavaScript API uniquement.
3. Crée un **Map ID** (Map Management → type JavaScript, Vector). Il est obligatoire pour les marqueurs.
4. La clé **serveur** (Routes API, Places API) ne sert pas avant les phases suivantes.

## 3. Vercel
Dans **Settings → Environment Variables**, ajoute :

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | clé navigateur restreinte |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Map ID |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app |

Puis **Redeploy** : les variables `NEXT_PUBLIC_*` sont figées à la compilation.

Tant qu'une variable manque, l'écran concerné affiche son nom au lieu de planter.
