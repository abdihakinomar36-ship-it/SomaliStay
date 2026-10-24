import type { Locale } from "./i18n/config";
import { en, type Dictionary } from "./i18n/en";
import { so } from "./i18n/so";

export function getDictionary(locale: Locale): Dictionary {
  return locale === "so" ? so : en;
}
