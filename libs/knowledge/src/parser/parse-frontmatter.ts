/** Values the naive parser used to store for unparsed YAML block scalars. */
export const YAML_BLOCK_SCALAR_MARKERS = new Set(['>', '>-', '>+', '|', '|-', '|+']);

export function isYamlBlockScalarMarker(value: string | null | undefined): boolean {
  return Boolean(value && YAML_BLOCK_SCALAR_MARKERS.has(value.trim()));
}

/**
 * Minimal YAML frontmatter parser for knowledge docs (no external yaml dep).
 */
export function splitFrontmatter(raw: string): { frontmatter: string | null; body: string } {
  const normalized = raw.replace(/^\uFEFF/, '');
  if (!normalized.startsWith('---')) {
    return { frontmatter: null, body: normalized };
  }
  const end = normalized.indexOf('\n---', 3);
  if (end < 0) {
    return { frontmatter: null, body: normalized };
  }
  const fm = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\r?\n/, '');
  return { frontmatter: fm, body };
}

function parseInlineArray(value: string): string[] | null {
  const v = value.trim();
  if (!v.startsWith('[') || !v.endsWith(']')) {
    return null;
  }
  const inner = v.slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(',').map((item) => String(parseScalar(item.trim())));
}

function parseScalar(value: string): string | string[] | boolean | number {
  const v = value.trim();
  const inlineArray = parseInlineArray(v);
  if (inlineArray) return inlineArray;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function leadingIndent(line: string): number {
  const match = /^[ \t]*/.exec(line);
  return match ? match[0].length : 0;
}

function stripCommonIndent(lines: string[]): string[] {
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => leadingIndent(line));
  const min = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => (line.trim().length === 0 ? '' : line.slice(min)));
}

function parseBlockScalar(kind: '>' | '|', chomp: string, rawLines: string[]): string {
  while (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop();
  }
  const lines = stripCommonIndent(rawLines);

  let text: string;
  if (kind === '|') {
    text = lines.join('\n');
  } else {
    const paragraphs: string[] = [];
    let current: string[] = [];
    const flush = (): void => {
      if (current.length > 0) {
        paragraphs.push(current.join(' '));
        current = [];
      }
    };
    for (const line of lines) {
      if (line === '') {
        flush();
        continue;
      }
      current.push(line.trim());
    }
    flush();
    text = paragraphs.join('\n');
  }

  if (chomp === '+') {
    return text.endsWith('\n') ? text : `${text}\n`;
  }
  return text.replace(/\n+$/g, '');
}

export function parseFrontmatterYaml(yaml: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let currentArrayKey: string | null = null;
  const lines = yaml.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const listMatch = /^-\s+(.+)$/.exec(trimmed);
    const listValue = listMatch?.[1];
    if (listValue && currentArrayKey) {
      const arr = (out[currentArrayKey] as string[]) ?? [];
      arr.push(String(parseScalar(listValue)));
      out[currentArrayKey] = arr;
      continue;
    }

    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(trimmed);
    if (!kv) continue;

    const key = kv[1];
    if (!key) continue;
    const rest = (kv[2] ?? '').trim();
    const block = /^([>|])([+-]?)$/.exec(rest);
    if (block) {
      currentArrayKey = null;
      const blockLines: string[] = [];
      while (i + 1 < lines.length) {
        const next = lines[i + 1] ?? '';
        if (next.trim() === '') {
          blockLines.push('');
          i += 1;
          continue;
        }
        if (leadingIndent(next) === 0) {
          break;
        }
        blockLines.push(next);
        i += 1;
      }
      out[key] = parseBlockScalar(block[1] as '>' | '|', block[2] ?? '', blockLines);
      continue;
    }

    if (rest === '') {
      currentArrayKey = key;
      out[key] = [];
      continue;
    }

    currentArrayKey = null;
    out[key] = parseScalar(rest);
  }

  return out;
}
