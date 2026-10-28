import { computeContentHash } from './content-hash';
import { inferMetadataFromPath, slugFromPath } from './infer-metadata-from-path';
import {
  knowledgeFrontmatterSchema,
  type KnowledgeFrontmatter,
} from './knowledge-frontmatter.schema';
import { parseFrontmatterYaml, splitFrontmatter } from './parse-frontmatter';

export interface ParsedKnowledgeFile {
  path: string;
  frontmatter: KnowledgeFrontmatter & { id: string; title: string; type: KnowledgeFrontmatter['type'] };
  body: string;
  contentHash: string;
}

const DESCRIPTION_MAX_LENGTH = 1024;

function titleFromBody(body: string, fallback: string): string {
  const match = /^#\s+(.+)$/m.exec(body);
  return match?.[1]?.trim() ?? fallback;
}

function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
}

export function descriptionFromBody(body: string): string | null {
  const lines = body.split(/\r?\n/);
  let pastTitle = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!pastTitle) {
      if (/^#\s+/.test(trimmed)) {
        pastTitle = true;
      }
      continue;
    }
    if (!trimmed) {
      continue;
    }
    const plain = stripMarkdownLinks(trimmed);
    if (!plain) {
      continue;
    }
    return plain.length <= DESCRIPTION_MAX_LENGTH
      ? plain
      : `${plain.slice(0, DESCRIPTION_MAX_LENGTH - 1)}…`;
  }

  return null;
}

function normalizeFrontmatterInput(
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...parsed };
  const description = out['description'];
  if (Array.isArray(description) || description === '') {
    delete out['description'];
  }
  return out;
}

export function parseKnowledgeFile(relativePath: string, raw: string): ParsedKnowledgeFile {
  const { frontmatter: fmRaw, body } = splitFrontmatter(raw);
  const inferred = inferMetadataFromPath(relativePath);
  const parsedFm = fmRaw ? normalizeFrontmatterInput(parseFrontmatterYaml(fmRaw)) : {};

  const merged = knowledgeFrontmatterSchema.parse({
    ...inferred,
    ...parsedFm,
  });

  const id = merged.id ?? slugFromPath(relativePath);
  const title =
    merged.title ??
    titleFromBody(body, id.replace(/-/g, ' '));

  const type = merged.type ?? inferred.type ?? 'spec';
  const description = merged.description ?? descriptionFromBody(body) ?? undefined;

  const frontmatter = {
    ...merged,
    id,
    title,
    type,
    ...(description ? { description } : {}),
  };

  const contentHash = computeContentHash(raw);

  return {
    path: relativePath.replace(/\\/g, '/'),
    frontmatter,
    body,
    contentHash,
  };
}
