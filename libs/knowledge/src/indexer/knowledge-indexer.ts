import * as path from 'node:path';
import type { Kysely } from 'kysely';
import { readSourceFile, scanKnowledgeSourcePaths } from '../config/scan-sources';
import { buildRegistryDocuments } from '../registry/build-registry-documents';
import { KnowledgeRepository } from '../repository/knowledge.repository';
import type { KnowledgeDatabase } from '../repository/types';
import { writeAgentRoutesFile } from '../routing/write-agent-routes';
import {
  indexKnowledgeDocument,
  isSkillsIndexPath,
  type IndexDocumentStats,
} from './index-document';
import { splitLessonsFile } from './split-lessons';

export interface ReindexOptions {
  workspaceRoot: string;
  pathFilter?: string;
  /** When false, skip writing docs/agent-routes.json (prod bootstrap / read-only FS). Default true. */
  writeAgentRoutes?: boolean;
}

export interface ReindexStats {
  indexed: number;
  skipped: number;
  deleted: number;
  chunks: number;
  durationMs: number;
}

export async function runKnowledgeReindex(
  db: Kysely<KnowledgeDatabase>,
  options: ReindexOptions,
): Promise<ReindexStats> {
  const start = Date.now();
  const repo = new KnowledgeRepository(db);
  const stats: IndexDocumentStats = { indexed: 0, skipped: 0, chunks: 0 };
  const seenPaths = new Set<string>();

  const sourcePaths = await scanKnowledgeSourcePaths(options.workspaceRoot);
  const filtered = options.pathFilter
    ? sourcePaths.filter((p) => p === options.pathFilter || p.startsWith(options.pathFilter!))
    : sourcePaths;

  for (const rel of filtered) {
    if (rel === 'tasks/lessons.md') {
      const raw = await readSourceFile(options.workspaceRoot, rel);
      const sections = splitLessonsFile(raw);
      for (const section of sections) {
        seenPaths.add(section.path);
        await indexKnowledgeDocument(repo, section.path, section.content, stats);
      }
      continue;
    }

    seenPaths.add(rel);
    const raw = await readSourceFile(options.workspaceRoot, rel);
    await indexKnowledgeDocument(repo, rel, raw, stats);
  }

  if (!options.pathFilter) {
    for (const doc of buildRegistryDocuments()) {
      seenPaths.add(doc.path);
      await indexKnowledgeDocument(repo, doc.path, doc.content, stats);
    }
  } else if (options.pathFilter.startsWith('registry/')) {
    for (const doc of buildRegistryDocuments()) {
      if (doc.path.startsWith(options.pathFilter)) {
        seenPaths.add(doc.path);
        await indexKnowledgeDocument(repo, doc.path, doc.content, stats);
      }
    }
  }

  let deleted = 0;
  if (!options.pathFilter) {
    const existing = await repo.listPaths();
    for (const p of existing) {
      if (isSkillsIndexPath(p)) {
        continue;
      }
      if (!seenPaths.has(p)) {
        await repo.deleteFileByPath(p);
        deleted += 1;
      }
    }
  }

  if (!options.pathFilter && options.writeAgentRoutes !== false) {
    const catalog = await repo.listRouteCatalog();
    await writeAgentRoutesFile(options.workspaceRoot, catalog);
  }

  return {
    indexed: stats.indexed,
    skipped: stats.skipped,
    deleted,
    chunks: stats.chunks,
    durationMs: Date.now() - start,
  };
}

export function resolveWorkspaceRoot(): string {
  return path.resolve(process.cwd());
}
