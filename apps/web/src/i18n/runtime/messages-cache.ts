import type { LocaleId, Messages } from '../types';

const cache = new Map<LocaleId, Messages>();

export async function getOrLoadMessages(
  locale: LocaleId,
  loader: () => Promise<Messages>,
): Promise<Messages> {
  const hit = cache.get(locale);
  if (hit) {
    return hit;
  }
  const messages = await loader();
  cache.set(locale, messages);
  return messages;
}
