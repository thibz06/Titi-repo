import fr from "@messages/fr.json";

export type Messages = typeof fr;
export const locales = ["fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

const catalogs: Record<Locale, Messages> = { fr };

/** Renvoie les textes d'une langue. L'anglais s'ajoutera ici (messages/en.json). */
export function getMessages(locale: Locale = defaultLocale): Messages {
  return catalogs[locale];
}

/** Remplace les {variables} d'un texte. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
