import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import {
  LIST_FILES_DEFAULT_LIMIT,
  LIST_FILES_MAX_LIMIT,
} from '../constants/search-scoring';
import type {
  KnowledgeDatabase,
  KnowledgeFileRow,
  KnowledgeFileUpsert,
  ListFilesFilters,
  ListFilesResult,
} from './types';

export class KnowledgeRepository {
  constructor(private readonly db: Kysely<KnowledgeDatabase>) {}

  async findFileByPath(path: string): Promise<KnowledgeFileRow | null> {
    const row = await this.db
      .selectFrom('knowledge_files')
      .selectAll()
      .where('path', '=', path)
      .executeTakeFirst();
    return row ?? null;
  }

  async findFileByContentHash(path: string, hash: string): Promise<boolean> {
    const row = await this.db
      .selectFrom('knowledge_files')
      .select('content_hash')
      .where('path', '=', path)
      .executeTakeFirst();
    return row?.content_hash === hash;
  }

  async listPaths(): Promise<string[]> {
    const rows = await this.db.selectFrom('knowledge_files').select('path').execute();
    return rows.map((r) => r.path);
  }

  async listFilesByPathPrefix(prefix: string): Promise<KnowledgeFileRow[]> {
    return this.db
      .selectFrom('knowledge_files')
      .selectAll()
      .where('path', 'like', `${prefix}%`)
      .execute();
  }

  async countFiles(): Promise<number> {
    const row = await this.db
      .selectFrom('knowledge_files')
      .select(sql<number>`count(*)::int`.as('count'))
      .executeTakeFirst();
    return row?.count ?? 0;
  }

  async listFiles(filters: ListFilesFilters): Promise<ListFilesResult> {
    const limit = Math.min(filters.limit ?? LIST_FILES_DEFAULT_LIMIT, LIST_FILES_MAX_LIMIT);
    const offset = filters.offset ?? 0;

    let countQ = this.db
      .selectFrom('knowledge_files')
      .select(sql<number>`count(*)::int`.as('count'));
    if (filters.type) {
      countQ = countQ.where('type', '=', filters.type);
    }
    if (filters.status) {
      countQ = countQ.where('status', '=', filters.status);
    }
    if (filters.scope) {
      countQ = countQ.where('scope', '=', filters.scope);
    }
    if (filters.tags && filters.tags.length > 0) {
      countQ = countQ.where(sql<boolean>`tags && ${filters.tags}::text[]`);
    }
    const countRow = await countQ.executeTakeFirst();
    const total = countRow?.count ?? 0;

    let q = this.db.selectFrom('knowledge_files').selectAll();
    if (filters.type) {
      q = q.where('type', '=', filters.type);
    }
    if (filters.status) {
      q = q.where('status', '=', filters.status);
    }
    if (filters.scope) {
      q = q.where('scope', '=', filters.scope);
    }
    if (filters.tags && filters.tags.length > 0) {
      q = q.where(sql<boolean>`tags && ${filters.tags}::text[]`);
    }

    const files = await q.orderBy('path', 'asc').limit(limit).offset(offset).execute();

    return { files, total, limit, offset };
  }

  async listTags(): Promise<Array<{ tag: string; count: number }>> {
    const result = await sql<{ tag: string; count: string }>`
      SELECT unnest(tags) AS tag, COUNT(*)::text AS count
      FROM knowledge_files
      GROUP BY tag
      ORDER BY COUNT(*) DESC, tag ASC
    `.execute(this.db);

    return result.rows.map((r) => ({
      tag: r.tag,
      count: Number.parseInt(r.count, 10),
    }));
  }

  async upsertFile(data: KnowledgeFileUpsert): Promise<string> {
    return this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('knowledge_files')
        .select('id')
        .where('path', '=', data.path)
        .executeTakeFirst();

      const now = new Date();
      const fileValues = {
        path: data.path,
        title: data.title,
        description: data.description,
        routing_text: data.routing_text,
        body: data.body,
        type: data.type,
        status: data.status,
        scope: data.scope,
        owner: data.owner,
        tags: data.tags,
        source_root: data.source_root,
        content_hash: data.content_hash,
        updated_at: data.updated_at ?? now,
        indexed_at: now,
      };

      let fileId: string;

      if (existing) {
        await trx
          .updateTable('knowledge_files')
          .set(fileValues)
          .where('id', '=', existing.id)
          .execute();
        fileId = existing.id;
        await trx.deleteFrom('knowledge_chunks').where('file_id', '=', fileId).execute();
      } else {
        const inserted = await trx
          .insertInto('knowledge_files')
          .values(fileValues)
          .returning('id')
          .executeTakeFirstOrThrow();
        fileId = inserted.id;
      }

      if (data.chunks.length > 0) {
        await trx
          .insertInto('knowledge_chunks')
          .values(
            data.chunks.map((chunk) => ({
              file_id: fileId,
              heading: chunk.heading,
              heading_path: chunk.heading_path,
              chunk_index: chunk.chunk_index,
              content: chunk.content,
              token_count: chunk.token_count,
              section_type: chunk.section_type,
              metadata: chunk.metadata,
              created_at: now,
              search_vector: sql`to_tsvector('english', coalesce(${chunk.heading}, '') || ' ' || ${chunk.content})`,
            })),
          )
          .execute();
      }

      return fileId;
    });
  }

  async deleteFileByPath(path: string): Promise<void> {
    await this.db.deleteFrom('knowledge_files').where('path', '=', path).execute();
  }

  async listRouteCatalog(): Promise<
    Array<{ path: string; title: string; description: string | null; type: string; scope: string | null; tags: string[] }>
  > {
    const rows = await this.db
      .selectFrom('knowledge_files')
      .select(['path', 'title', 'description', 'type', 'scope', 'tags'])
      .where('status', '=', 'active')
      .where((eb) =>
        eb.or([
          eb('type', '=', 'skill'),
          eb('type', '=', 'overview'),
        ]),
      )
      .orderBy('path', 'asc')
      .execute();
    return rows;
  }
}
