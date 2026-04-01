import { headers } from 'next/headers';

import { parseAcceptLanguage } from '../domain/parse-accept-language';
import { resolveLocalePriority } from '../domain/locale-priority';
import type { LocaleId } from '../types';
import { getCookieLocale } from './cookies';
import { getUserLocale } from './get-user-locale';

export async function getRequestLocale(): Promise<LocaleId> {
  const userLocale = await getUserLocale();
  const cookieLocale = await getCookieLocale();
  const header = (await headers()).get('accept-language');
  const headerLocales = parseAcceptLanguage(header);

  return resolveLocalePriority({
    userLocale,
    cookieLocale,
    headerLocales,
  });
}
