# Brouillons de fiches

Un fichier JSON par lieu dans `content/places/<slug>.json`. L'app les lit directement : Explorer montre les fiches `published`, la page Relecture montre les `draft` avec un avertissement.

Une fiche rédigée reste en `draft`. Elle ne passe en `published` que sur décision de Thibault, avec `verified_at` (date) et `verified_by` (son nom).

## Règles de rédaction
- Aucune donnée inventée. Un fait (prix, horaire, durée, difficulté, accès, risque, histoire) n'est écrit que s'il est lu dans une source réellement consultée, listée dans `sources` avec l'extrait qui le prouve (`evidence`). Sinon le champ vaut `null` (ou `[]`).
- Rien ne vient de Google (ni coordonnées, ni horaires, ni notes, ni avis). `google_place_id` reste `null`.
- Coordonnées : Wikidata, Wikipedia ou OpenStreetMap, avec l'URL dans `coords_source_url`.
- Prix en roupies mauriciennes uniquement, tels qu'écrits par la source officielle du lieu. Jamais de conversion.
- `opening_hours` en syntaxe OSM (ex. `Mo-Fr 08:30-17:00; Sa 09:00-12:00; PH off`), seulement si une source officielle donne les horaires.
- `interest` et `xp_base` restent `null` : décisions de l'éditeur. `verified_at` et `verified_by` restent `null` tant que la fiche est en `draft`.
- Textes en français, tutoiement, ton sobre de guide. Pas de superlatifs gratuits, pas de légende. Une hypothèse est écrite comme une hypothèse.
- Ne copie pas le texte des sources : reformule.

## Sources : au-delà de Wikipédia
- Wikipédia et Wikidata servent aux coordonnées et au contexte, pas plus. Pour ce qu'on fait sur place, combien ça coûte et quand c'est ouvert, cherche d'abord le **site officiel du lieu ou du prestataire**, puis l'office du tourisme (mauritiusnow.com, mymauritius.travel), les organismes publics (govmu.org, Beach Authority, National Heritage Fund, National Parks), la presse mauricienne.
- Les plateformes de réservation (GetYourGuide, Viator, TripAdvisor, Klook…) et les blogs de voyage servent à **repérer** des activités et des prestataires. On ne recopie ni leurs textes, ni leurs notes, ni leurs avis. Un prix lu sur une plateforme peut être cité dans `price_note` avec le nom de la plateforme, la devise et la date, mais ne remplit pas les champs de prix.
- Une activité payante (catamaran, plongée, tyrolienne…) est une fiche comme une autre : famille `mer_activites` ou `sport_loisirs`, coordonnées du point de départ, `website_url` vers le prestataire. S'il y a plusieurs prestataires équivalents, la fiche décrit l'activité et le lieu, et les cite sans en recommander un.
- Si un site refuse les robots (403, Cloudflare, captcha), ne le contourne pas : pas de faux navigateur, pas de cache tiers. Note-le dans `open_questions`.
- Prix : en roupies quand la source les donne en roupies. S'ils ne sont donnés qu'en euros ou dollars, laisse les champs de prix à `null`, mets `price_kind` et écris le montant tel quel dans `price_note` avec la source et la date.

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
  "status": "draft | published",
  "verified_at": null,
  "verified_by": null,
  "sources": [
    { "field": "nom du champ appuyé (ex. price_visitor_mur_min, description_md, coords)", "url": "https://…", "title": "Titre de la page", "accessed_at": "AAAA-MM-JJ", "evidence": "Extrait court de la page qui prouve le fait" }
  ],
  "media": [
    { "kind": "photo", "external_url": "URL du fichier Wikimedia Commons", "credit": "Auteur", "license": "CC BY-SA 4.0…", "source_url": "URL de la page du fichier sur Commons", "is_cover": true }
  ],
  "open_questions": ["Ce qui n'a pas pu être vérifié et que l'éditeur devra trancher"],
  "website_url": "https://site-officiel… ou null",
  "secret": null
}
```

`duration_*` en minutes ; `difficulty` de 1 à 5 ; `risk_level` : `low`, `medium`, `high` ou `null`.
`accessibility` et `best_time` sont des objets libres dont chaque valeur est sourcée, sinon `null`.

`secret` ne concerne que les lieux insolites de « L'Île secrète ». Sinon `null`. Quand il est rempli :

```json
"secret": {
  "story_md": "Récit long, façon magazine, uniquement à partir de faits sourcés. Une hypothèse est écrite comme une hypothèse. Aucune légende inventée.",
  "why_unknown_md": "Pourquoi peu de visiteurs y vont, si une source le dit, sinon null",
  "access_md": "Comment y accéder, si sourcé, sinon null",
  "precautions_md": "Précautions, si sourcées, sinon null",
  "legal_access_checked": false
}
```

`legal_access_checked` reste `false` : seul l'éditeur confirme que l'accès est légal. Chaque paragraphe du récit doit être couvert par une entrée `sources` avec `field: "secret"`.
