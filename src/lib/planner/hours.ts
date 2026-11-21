// Horaires d'ouverture (syntaxe OSM) : ouvert, fermé, ou inconnu. Jamais deviné.
import OpeningHours from "opening_hours";

export type OpenState = "open" | "closed" | "unknown";

/** Date « locale » construite champ par champ : le résultat ne dépend pas du fuseau de l'appareil. */
function localDate(day: string, minutes: number): Date {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
}

/**
 * La bibliothèque ne connaît pas les jours fériés mauriciens : on traite « PH » nous-mêmes,
 * avec la liste de fériés fournie, puis on lui confie le reste de la règle.
 */
function splitHolidayRules(value: string): { regular: string; phOff: boolean; phHours: string | null } {
  let phOff = false;
  let phHours: string | null = null;
  const kept: string[] = [];
  for (const rule of value.split(";").map((r) => r.trim()).filter(Boolean)) {
    if (/^PH\s+(off|closed)$/i.test(rule)) {
      phOff = true;
      continue;
    }
    const onlyPh = /^PH\s+(.+)$/i.exec(rule);
    if (onlyPh?.[1]) {
      phHours = onlyPh[1];
      continue;
    }
    if (/\bPH\b/.test(rule)) {
      // « Mo-Su,PH 08:30-17:30 » : les fériés suivent les mêmes heures.
      const hours = /\s(\d{1,2}:\d{2}.*)$/.exec(rule)?.[1] ?? null;
      if (hours) phHours = hours;
      const cleaned = rule.replace(/,\s*PH\b/g, "").replace(/\bPH\s*,\s*/g, "");
      if (!/\bPH\b/.test(cleaned)) kept.push(cleaned);
      continue;
    }
    kept.push(rule);
  }
  return { regular: kept.join("; "), phOff, phHours };
}

function stateOf(value: string, at: Date): OpenState {
  try {
    const oh = new OpeningHours(value, { lat: "-20.2", lon: "57.5", address: { country_code: "mu", state: "" } });
    if (oh.getUnknown(at)) return "unknown";
    return oh.getState(at) ? "open" : "closed";
  } catch {
    return "unknown";
  }
}

/** État d'un lieu à un instant donné. `null` (horaires non renseignés) donne "unknown". */
export function openStateAt(openingHours: string | null, day: string, minutes: number, holidays: string[]): OpenState {
  if (!openingHours) return "unknown";
  const { regular, phOff, phHours } = splitHolidayRules(openingHours);
  if (holidays.includes(day)) {
    if (phOff) return "closed";
    if (phHours) return stateOf(phHours, localDate(day, minutes));
  }
  if (!regular) return "unknown";
  return stateOf(regular, localDate(day, minutes));
}

/** Ouvert pendant toute la visite ? "closed" dès qu'un des deux bouts tombe sur une fermeture. */
export function openStateDuring(openingHours: string | null, day: string, arrive: number, leave: number, holidays: string[]): OpenState {
  const a = openStateAt(openingHours, day, arrive, holidays);
  const b = openStateAt(openingHours, day, Math.max(arrive, leave - 1), holidays);
  if (a === "closed" || b === "closed") return "closed";
  if (a === "unknown" || b === "unknown") return "unknown";
  return "open";
}
