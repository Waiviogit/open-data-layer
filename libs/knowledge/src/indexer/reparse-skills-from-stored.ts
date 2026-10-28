import type { Kysely } from 'kysely';
import { KnowledgeRepository } from '../repository/knowledge.repository';
import type { KnowledgeDatabase } from '../repository/types';
import {
  indexKnowledgeDocument,
  isSkillsIndexPath,
  type IndexDocumentStats,
} from './index-document';
import type { ReindexStats } from './knowledge-indexer';

export interface ReparseSkillsFromStoredOptions {
  warn?: (message: string) => void;
}

/**
 * Re-parse indexed `odl/` rows from stored markdown bodies.
 * Does not read the snapshot or GitHub and does not delete rows.
 */
export async function reparseSkillsFromStoredBodies(
  db: Kysely<KnowledgeDatabase>,
  options: ReparseSkillsFromStoredOptions = {},
): Promise<ReindexStats> {
  const start = Date.now();
  const repo = new KnowledgeRepository(db);
  const stats: IndexDocumentStats = { indexed: 0, skipped: 0, chunks: 0 };
  const files = await repo.listFilesByPathPrefix('odl/');

  for (const file of files) {
    if (!isSkillsIndexPath(file.path)) {
      continue;
    }
    try {
      await indexKnowledgeDocument(repo, file.path, file.body, stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.warn?.(`Skipped skills reparse ${file.path}: ${message}`);
    }
  }

  return {
    indexed: stats.indexed,
    skipped: stats.skipped,
    deleted: 0,
    chunks: stats.chunks,
    durationMs: Date.now() - start,
  };
}
