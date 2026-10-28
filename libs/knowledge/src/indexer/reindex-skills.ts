import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { Kysely } from 'kysely';
import { KnowledgeRepository } from '../repository/knowledge.repository';
import type { KnowledgeDatabase } from '../repository/types';
import {
  indexKnowledgeDocument,
  isSkillsIndexPath,
  type IndexDocumentStats,
} from './index-document';
import type { ReindexStats } from './knowledge-indexer';

export interface ReindexSkillsOptions {
  skillsRoot: string;
  warn?: (message: string) => void;
}

async function walkOdlMarkdown(skillsRoot: string): Promise<string[]> {
  const odlDir = path.join(skillsRoot, 'odl');
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        out.push(path.relative(skillsRoot, abs).replace(/\\/g, '/'));
      }
    }
  }

  await walk(odlDir);
  return out.sort();
}

export async function reindexSkills(
  db: Kysely<KnowledgeDatabase>,
  options: ReindexSkillsOptions,
): Promise<ReindexStats> {
  const start = Date.now();
  const repo = new KnowledgeRepository(db);
  const stats: IndexDocumentStats = { indexed: 0, skipped: 0, chunks: 0 };
  const seenPaths = new Set<string>();
  const sourcePaths = await walkOdlMarkdown(options.skillsRoot);

  for (const rel of sourcePaths) {
    seenPaths.add(rel);
    try {
      const raw = await readFile(path.join(options.skillsRoot, rel), 'utf8');
      await indexKnowledgeDocument(repo, rel, raw, stats);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.warn?.(`Skipped skills file ${rel}: ${message}`);
    }
  }

  let deleted = 0;
  const existing = await repo.listPaths();
  for (const p of existing) {
    if (!isSkillsIndexPath(p)) {
      continue;
    }
    if (!seenPaths.has(p)) {
      await repo.deleteFileByPath(p);
      deleted += 1;
    }
  }

  return {
    indexed: stats.indexed,
    skipped: stats.skipped,
    deleted,
    chunks: stats.chunks,
    durationMs: Date.now() - start,
  };
}
