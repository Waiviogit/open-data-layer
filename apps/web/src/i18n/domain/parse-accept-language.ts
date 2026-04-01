type ParsedEntry = { tag: string; q: number };

function parseQ(param: string): number {
  const m = /^q\s*=\s*([\d.]+)/i.exec(param.trim());
  if (!m) {
    return 1;
  }
  const n = Number.parseFloat(m[1]);
  if (!Number.isFinite(n)) {
    return 1;
  }
  if (n < 0) {
    return 0;
  }
  if (n > 1) {
    return 1;
  }
  return n;
}

/**
 * Parses Accept-Language and returns ordered language tags (highest q first).
 */
export function parseAcceptLanguage(header?: string | null): string[] {
  if (header == null || !header.trim()) {
    return [];
  }

  const parts = header.split(',');
  const entries: ParsedEntry[] = [];

  for (const part of parts) {
    const segment = part.trim();
    if (!segment) {
      continue;
    }
    const [langPart, ...params] = segment.split(';').map((s) => s.trim());
    if (!langPart) {
      continue;
    }
    let q = 1;
    for (const p of params) {
      if (/^q\s*=/i.test(p)) {
        q = parseQ(p);
        break;
      }
    }
    entries.push({ tag: langPart.replace(/_/g, '-'), q });
  }

  entries.sort((a, b) => b.q - a.q);

  return entries.map((e) => e.tag);
}
