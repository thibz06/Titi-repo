# Brouillons de fiches

Un fichier JSON par lieu dans `content/places/<slug>.json`. Tous restent en `status: "draft"` : seul Thibault publie.

## Règles de rédaction
- Aucune donnée inventée. Un fait (prix, horaire, durée, difficulté, accès, risque, histoire) n'est écrit que s'il est lu dans une source réellement consultée, listée dans `sources` avec l'extrait qui le prouve (`evidence`). Sinon le champ vaut `null` (ou `[]`).
- Rien ne vient de Google (ni coordonnées, ni horaires, ni notes, ni avis). `google_place_id` reste `null`.
- Coordonnées : Wikidata, Wikipedia ou OpenStreetMap, avec l'URL dans `coords_source_url`.
- Prix en roupies mauriciennes uniquement, tels qu'écrits par la source officielle du lieu. Jamais de conversion.
- `opening_hours` en syntaxe OSM (ex. `Mo-Fr 08:30-17:00; Sa 09:00-12:00; PH off`), seulement si une source officielle donne les horaires.
- `interest`, `xp_base`, `verified_at`, `verified_by` restent `null` : décisions de l'éditeur.
- Textes en français, tutoiement, ton sobre de guide. Pas de superlatifs gratuits, pas de légende. Une hypothèse est écrite comme une hypothèse.
- Ne copie pas le texte des sources : reformule.

## Format

```json
{
  "slug": "kebab-case-sans-accent",
  "name": "Nom affiché",
  "family": "plages_lagon | cascades_rivieres | randos_sommets | nature_parcs | culture_patrimoine | villages_marches | manger | mer_activites | sport_loisirs",
  "tags": ["gratuit", "famille", "insolite", "spot_photo", "coucher_soleil", "pluie_ok"],
  "region": "nord | nord_ouest | ouest | sud_ouest | sud | sud_est | est | centre",
  "locality": "Village ou ville, ou null",
  "lat": -20.0,
  "lng": 57.5,
  "coords_source_url": "https://…",
  "google_place_id": null,
  "pitch": "Une phrase, 140 caractères maximum.",
  "description_md": "2 à 4 phrases factuelles et sourcées, ou null",
  "why_go_md": "Pourquoi y aller, appuyé sur des faits sourcés, ou null",
  "likes": ["faits sourcés uniquement"],
  "watchouts": ["mises en garde sourcées uniquement"],
  "tips_md": null,
  "duration_min": null,
  "duration_max": null,
  "price_kind": "free | paid | variable | null",
  "price_visitor_mur_min": null,
  "price_visitor_mur_max": null,
  "price_resident_mur": null,
  "price_note": null,
  "opening_hours": null,
  "hours_note": null,
  "difficulty": null,
  "accessibility": null,
  "best_time": null,
  "rain_ok": null,
  "risk_level": null,
  "risk_note": null,
  "interest": null,
  "rarity": "incontournable | peu_connu | insolite | tres_confidentiel | null",
  "rarity_reason": "Argument sourcé, ou null",
  "xp_base": null,
  "status": "draft",
  "verified_at": null,
  "verified_by": null,
  "sources": [
    { "field": "nom du champ appuyé (ex. price_visitor_mur_min, description_md, coords)", "url": "https://…", "title": "Titre de la page", "accessed_at": "AAAA-MM-JJ", "evidence": "Extrait court de la page qui prouve le fait" }
  ],
  "media": [
    { "kind": "photo", "external_url": "URL du fichier Wikimedia Commons", "credit": "Auteur", "license": "CC BY-SA 4.0…", "source_url": "URL de la page du fichier sur Commons", "is_cover": true }
  ],
  "open_questions": ["Ce qui n'a pas pu être vérifié et que l'éditeur devra trancher"]
}
```

`duration_*` en minutes ; `difficulty` de 1 à 5 ; `risk_level` : `low`, `medium`, `high` ou `null`.
`accessibility` et `best_time` sont des objets libres dont chaque valeur est sourcée, sinon `null`.
