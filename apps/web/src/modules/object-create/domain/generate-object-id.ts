import { slugifyName } from './slugify-name';

const PREFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const PREFIX_LENGTH = 3;

function randomPrefixLetters(): string {
  const bytes = new Uint8Array(PREFIX_LENGTH);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < PREFIX_LENGTH; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = '';
  for (let i = 0; i < PREFIX_LENGTH; i += 1) {
    const byte = bytes[i] ?? 0;
    out += PREFIX_ALPHABET[byte % PREFIX_ALPHABET.length];
  }
  return out;
}

/** Random 3-letter lowercase prefix for new ODL objects. */
export function generatePrefix(): string {
  return randomPrefixLetters();
}

/** Builds `{prefix}-{slug}` from display name; prefix only when name is empty. */
export function buildObjectId(prefix: string, name: string): string {
  const slug = slugifyName(name);
  return slug.length > 0 ? `${prefix}-${slug}` : prefix;
}

/** @deprecated Use `generatePrefix()` — kept for tests expecting a short random id. */
export function generateObjectId(): string {
  return generatePrefix();
}
