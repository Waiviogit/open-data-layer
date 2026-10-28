import { chunkMarkdown } from '../chunker/chunk-markdown';
import { parseKnowledgeFile } from '../parser/parse-knowledge-file';
import type { KnowledgeRepository } from '../repository/knowledge.repository';
import { buildRoutingText } from '../routing/build-routing-text';

export interface IndexDocumentStats {
  indexed: number;
  skipped: number;
  chunks: number;
}

export function sourceRootForPath(relativePath: string): string {
  if (relativePath.startsWith('registry/')) return 'registry';
  if (relativePath.startsWith('tasks/')) return 'tasks';
  if (relativePath.startsWith('docs/')) return 'docs';
  if (relativePath.startsWith('odl/')) return 'skills';
  return '.';
}

export function isSkillsIndexPath(relativePath: string): boolean {
  return relativePath.startsWith('odl/');
}

export async function indexKnowledgeDocument(
  repo: KnowledgeRepository,
  relativePath: string,
  raw: string,
  stats: IndexDocumentStats,
): Promise<void> {
  const parsed = parseKnowledgeFile(relativePath, raw);
  const existing = await repo.findFileByPath(parsed.path);
  const description = parsed.frontmatter.description?.trim() || null;
  const unchanged =
    existing?.content_hash === parsed.contentHash &&
    existing.routing_text != null &&
    existing.description === description &&
    existing.title === parsed.frontmatter.title;
  if (unchanged) {
    stats.skipped += 1;
    return;
  }

  const singleChunk = parsed.frontmatter.type === 'overview';
  const chunks = chunkMarkdown(parsed.body, { singleChunk });
  const routingText = buildRoutingText({
    title: parsed.frontmatter.title,
    description,
    path: parsed.path,
    tags: parsed.frontmatter.tags,
  });

  if (chunks.length > 0 && description) {
    chunks[0] = {
      ...chunks[0],
      content: `${description}\n\n${chunks[0].content}`,
    };
  }

  await repo.upsertFile({
    path: parsed.path,
    title: parsed.frontmatter.title,
    description,
    routing_text: routingText,
    body: raw,
    type: parsed.frontmatter.type ?? 'spec',
    status: parsed.frontmatter.status,
    scope: parsed.frontmatter.scope ?? null,
    owner: parsed.frontmatter.owner ?? null,
    tags: parsed.frontmatter.tags,
    source_root: sourceRootForPath(parsed.path),
    content_hash: parsed.contentHash,
    updated_at: parsed.frontmatter.updated_at ?? null,
    chunks: chunks.map((c) => ({
      heading: c.heading,
      heading_path: c.headingPath,
      chunk_index: c.chunkIndex,
      content: c.content,
      token_count: c.tokenCount,
      section_type: c.sectionType,
      metadata: {
        type: parsed.frontmatter.type,
        scope: parsed.frontmatter.scope,
        tags: parsed.frontmatter.tags,
        section: c.sectionType,
      },
    })),
  });

  stats.indexed += 1;
  stats.chunks += chunks.length;
}
