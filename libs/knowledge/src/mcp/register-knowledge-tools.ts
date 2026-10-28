import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { z } from 'zod';
import {
  LIST_FILES_DEFAULT_LIMIT,
  LIST_FILES_MAX_LIMIT,
} from '../constants/search-scoring';
import { runKnowledgeReindex } from '../indexer/knowledge-indexer';
import {
  getObjectType,
  getUpdateSchema,
  listObjectTypes,
  listUpdateTypes,
} from '../registry/registry-query';
import { getObjectCreatePlaybook } from '../registry/object-create-playbook';
import type { KnowledgeDatabase } from '../repository/types';
import { resolveLegacySkillPath } from '../routing/legacy-skill-path';
import type { KnowledgeMcpDeps } from './mcp-tool.deps';
import { jsonToolResult, toolError } from './mcp-tool.helpers';

const KNOWLEDGE_TYPES =
  'skill | playbook | reference | spec | overview | lesson | agents | registry';

export function registerKnowledgeTools(server: McpServer, deps: KnowledgeMcpDeps): void {
  server.registerTool(
    'search_knowledge',
    {
      description:
        'Discover indexed docs by hybrid FTS + trigram query. Use for initial discovery; then prefer resolve_doc, get_context, or get_file. Example queries: "hive account signup", "knowledge api routing", "chain-indexer vote ingestion".',
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .describe('Natural language or keyword query (hybrid FTS + trigram)'),
        limit: z.coerce
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe('Max results (default 10)'),
        types: z
          .array(z.string())
          .optional()
          .describe(`Optional doc types: ${KNOWLEDGE_TYPES}`),
        tags: z.array(z.string()).optional().describe('Optional tag filter (any match)'),
        scope: z
          .string()
          .optional()
          .describe('App or platform scope, e.g. platform, web, chain-indexer'),
      }),
    },
    async (args) => {
      const results = await deps.search.searchKnowledge(args);
      return jsonToolResult({ results });
    },
  );

  server.registerTool(
    'resolve_doc',
    {
      description:
        'Resolve the best doc path(s) for a task before get_file. Uses curated routes, trigram file match, then hybrid search. Prefer over raw search when implementing a feature.',
      inputSchema: z.object({
        topic: z.string().min(1).describe('Task or feature topic in natural language'),
        scope: z
          .string()
          .optional()
          .describe('Optional app scope, e.g. chain-indexer, query-api'),
        max_routes: z.coerce
          .number()
          .int()
          .min(1)
          .max(10)
          .default(5)
          .describe('Max routes to return (default 5)'),
      }),
    },
    async (args) => {
      const result = await deps.router.resolveDoc({
        topic: args.topic,
        scope: args.scope,
        maxRoutes: args.max_routes,
      });
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_file',
    {
      description:
        'Return full markdown file by repo-relative path (from resolve_doc, search_knowledge, or list_files). Includes title, description, tags, and body.',
      inputSchema: z.object({
        path: z
          .string()
          .min(1)
          .describe('Repo-relative path, e.g. odl/hive-account-signup/SKILL.md'),
      }),
    },
    async (args) => {
      const resolved = resolveLegacySkillPath(args.path);
      const file = await deps.repo.findFileByPath(resolved.path);
      if (!file) {
        return toolError(`File not found: ${args.path}`);
      }
      return jsonToolResult({
        path: file.path,
        ...(resolved.movedFrom ? { moved_from: resolved.movedFrom } : {}),
        title: file.title,
        description: file.description,
        type: file.type,
        status: file.status,
        tags: file.tags,
        body: file.body,
      });
    },
  );

  server.registerTool(
    'get_context',
    {
      description:
        'Return a compact chunk bundle for a topic — uses route resolver first, then hybrid search fallback. Call early before implementing a feature.',
      inputSchema: z.object({
        topic: z.string().min(1).describe('Task or feature topic in natural language'),
        max_chunks: z.coerce
          .number()
          .int()
          .min(1)
          .max(20)
          .default(8)
          .describe('Max chunks to return (default 8)'),
        scope: z.string().optional().describe('Optional app scope to bias results'),
      }),
    },
    async (args) => {
      const { routes, chunks } = await deps.router.buildContextRoutes({
        topic: args.topic,
        maxChunks: args.max_chunks,
        scope: args.scope,
      });
      return jsonToolResult({ routes, results: chunks });
    },
  );

  server.registerTool(
    'list_files',
    {
      description:
        'List indexed knowledge files with filters and pagination. On first visit use type=skill to see playbooks with description one-liners.',
      inputSchema: z.object({
        type: z
          .string()
          .optional()
          .describe(`Doc type filter: ${KNOWLEDGE_TYPES}`),
        status: z.string().optional().describe('active, draft, or deprecated'),
        scope: z.string().optional().describe('App or platform scope'),
        tags: z.array(z.string()).optional().describe('Tag filter (any match)'),
        limit: z.coerce
          .number()
          .int()
          .min(1)
          .max(LIST_FILES_MAX_LIMIT)
          .optional()
          .describe(`Page size (default ${LIST_FILES_DEFAULT_LIMIT}, max ${LIST_FILES_MAX_LIMIT})`),
        offset: z.coerce
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Pagination offset (default 0)'),
      }),
    },
    async (args) => {
      const result = await deps.repo.listFiles({
        type: args.type,
        status: args.status,
        scope: args.scope,
        tags: args.tags,
        limit: args.limit,
        offset: args.offset,
      });
      return jsonToolResult({
        files: result.files.map((f) => ({
          path: f.path,
          title: f.title,
          description: f.description,
          type: f.type,
          status: f.status,
          scope: f.scope,
          tags: f.tags,
        })),
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      });
    },
  );

  server.registerTool(
    'list_tags',
    {
      description: 'List all indexed tags with document counts — useful to discover topic vocabulary.',
      inputSchema: z.object({}),
    },
    async () => {
      const tags = await deps.repo.listTags();
      return jsonToolResult({ tags });
    },
  );

  server.registerTool(
    'reindex',
    {
      description: 'Manually trigger knowledge reindex (dev/admin only)',
      inputSchema: z.object({
        path: z.string().optional().describe('Optional path filter; empty reindexes all'),
      }),
    },
    async (args) => {
      if (!deps.allowReindex) {
        return toolError('Reindex is disabled. Set KNOWLEDGE_ALLOW_REINDEX=true.');
      }
      const stats = await runKnowledgeReindex(deps.db, {
        workspaceRoot: deps.workspaceRoot,
        pathFilter: args.path?.trim() || undefined,
      });
      return jsonToolResult(stats);
    },
  );

  server.registerTool(
    'list_object_types',
    {
      description: 'List all ODL object types from the live registry',
      inputSchema: z.object({}),
    },
    async () => jsonToolResult({ object_types: listObjectTypes() }),
  );

  server.registerTool(
    'get_object_type',
    {
      description:
        'Get object type definition, supported updates, and create example — use for chain object_create payloads',
      inputSchema: z.object({
        object_type: z.string().min(1).describe('Registry object type id'),
      }),
    },
    async (args) => {
      const result = getObjectType(args.object_type);
      if (!result) {
        return toolError(`Unknown object type: ${args.object_type}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_create_playbook',
    {
      description:
        'Get object create playbook: registry summary, product required_updates, update_summaries, and indexed skill excerpt. Call before odl_build_object_create.',
      inputSchema: z.object({
        object_type: z.string().min(1).describe('Registry object type id'),
      }),
    },
    async (args) => {
      const result = await getObjectCreatePlaybook({
        objectType: args.object_type,
        repo: deps.repo,
      });
      if (!result) {
        return toolError(`Unknown object type: ${args.object_type}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'list_update_types',
    {
      description: 'List all ODL update types from the live registry',
      inputSchema: z.object({}),
    },
    async () => jsonToolResult({ update_types: listUpdateTypes() }),
  );

  server.registerTool(
    'get_update_schema',
    {
      description:
        'Get update type JSON Schema and broadcast example — use for custom_json update payloads',
      inputSchema: z.object({
        update_type: z.string().min(1).describe('Registry update type id'),
      }),
    },
    async (args) => {
      const result = getUpdateSchema(args.update_type);
      if (!result) {
        return toolError(`Unknown update type: ${args.update_type}`);
      }
      return jsonToolResult(result);
    },
  );
}

export function createKnowledgeDb(connectionString: string): Kysely<KnowledgeDatabase> {
  return new Kysely<KnowledgeDatabase>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  });
}
