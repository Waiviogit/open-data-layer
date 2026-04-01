import { locales } from '../config/locales';
import type { LocaleId } from '../types';

const rtlById = new Map<LocaleId, boolean>(
  locales.map((l) => [
    l.id,
    Boolean((l as { rtl?: boolean }).rtl),
  ]),
);

export function isRTL(locale: LocaleId): boolean {
  return rtlById.get(locale) === true;
}
