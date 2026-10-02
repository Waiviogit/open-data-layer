import { SUPPORTED_CURRENCIES, UPDATE_TYPES } from '@opden-data-layer/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { objectUpdatesFeedQuerySchema } from '../../domain/object-updates/schemas/object-updates-feed.schema';
import {
  objectRefListQuerySchema,
  objectFieldReferencesSummaryQuerySchema,
  relatedAlbumListQuerySchema,
  relatedAlbumPreviewQuerySchema,
  resolveNestedObjectsBodySchema,
  resolveObjectBodySchema,
} from '../../domain/objects';
import {
  objectOwnershipQuerySchema,
  userSocialListQuerySchema,
} from '../../domain/social/user-social-list.schema';
import { objectExpertListQuerySchema } from '../../domain/objects/object-expert-list.schema';
import { activityAuthorsFilterFields } from '../../domain/governance/activity-authors-filter.schema';
import { catalogDescription } from '../mcp-tool-catalog';
import type { McpToolDeps } from '../mcp-tool.deps';
import {
  jsonToolResult,
  pickMcpContext,
  toolError,
  withMcpLocaleContext,
} from '../mcp-tool.helpers';

export function registerObjectTools(server: McpServer, deps: McpToolDeps): void {
  server.registerTool(
    'resolve_object',
    {
      description: catalogDescription('resolve_object'),
      inputSchema: withMcpLocaleContext(resolveObjectBodySchema),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getObjectById.execute({
        objectId: args.object_id,
        updateTypes: args.update_types,
        locale: ctx.locale,
        includeRejected: args.include_rejected,
        governanceObjectIdFromHeader: ctx.governanceObjectIdFromHeader,
        viewerAccount: ctx.viewerAccount,
      });
      if (!result) {
        return toolError(`Object not found: ${args.object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'resolve_nested_objects',
    {
      description: catalogDescription('resolve_nested_objects'),
      inputSchema: withMcpLocaleContext(resolveNestedObjectsBodySchema),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getNestedObjects.execute({
        ids: args.ids,
        updateTypes: args.update_types,
        locale: ctx.locale,
        governanceObjectIdFromHeader: ctx.governanceObjectIdFromHeader,
        viewerAccount: ctx.viewerAccount,
      });
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'check_object_exists',
    {
      description: catalogDescription('check_object_exists'),
      inputSchema: z.object({
        object_id: z.string().min(1).describe('Object id to check'),
      }),
    },
    async (args) => {
      const exists = await deps.checkObjectExists.execute(args.object_id);
      return jsonToolResult({ exists });
    },
  );

  server.registerTool(
    'get_object_options',
    {
      description: catalogDescription('get_object_options'),
      inputSchema: withMcpLocaleContext(
        z.object({
          object_id: z.string().min(1).describe('Object id to load variant options for'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getObjectOptions.execute(
        args.object_id,
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`Object not found: ${args.object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  const refListSchema = withMcpLocaleContext(
    objectRefListQuerySchema.extend({
      object_id: z.string().min(1).describe('Source object id'),
    }),
  );

  const registerRefListTool = (
    name: string,
    description: string,
    updateType:
      | typeof UPDATE_TYPES.IS_RELATED_TO
      | typeof UPDATE_TYPES.IS_SIMILAR_TO
      | typeof UPDATE_TYPES.ADD_ON,
  ): void => {
    server.registerTool(
      name,
      { description, inputSchema: refListSchema },
      async (args) => {
        const ctx = pickMcpContext(args);
        const { object_id, limit, cursor } = args;
        const result = await deps.getObjectRefList.execute(
          object_id,
          updateType,
          { limit, cursor },
          ctx.locale,
          ctx.governanceObjectIdFromHeader,
          ctx.viewerAccount,
        );
        if (!result) {
          return toolError(`Object not found: ${object_id}`);
        }
        return jsonToolResult(result);
      },
    );
  };

  registerRefListTool(
    'get_object_related',
    catalogDescription('get_object_related'),
    UPDATE_TYPES.IS_RELATED_TO,
  );
  registerRefListTool(
    'get_object_similar',
    catalogDescription('get_object_similar'),
    UPDATE_TYPES.IS_SIMILAR_TO,
  );
  registerRefListTool(
    'get_object_add_on',
    catalogDescription('get_object_add_on'),
    UPDATE_TYPES.ADD_ON,
  );

  server.registerTool(
    'get_object_field_references',
    {
      description: catalogDescription('get_object_field_references'),
      inputSchema: withMcpLocaleContext(
        objectFieldReferencesSummaryQuerySchema.extend({
          object_id: z.string().min(1).describe('Source person or business object id'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getObjectFieldReferencesSummary.execute(
        args.object_id,
        { limit: args.limit },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`Object not found: ${args.object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_field_references_by_type',
    {
      description: catalogDescription('get_object_field_references_by_type'),
      inputSchema: withMcpLocaleContext(
        objectRefListQuerySchema.extend({
          object_id: z.string().min(1).describe('Source person or business object id'),
          reference_object_type: z
            .string()
            .min(1)
            .describe('Target object type (e.g. book, product)'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { object_id, reference_object_type, limit, cursor } = args;
      const result = await deps.getObjectFieldReferencesByType.executeByType(
        object_id,
        reference_object_type,
        { limit, cursor },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`Object not found: ${object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_related_album_preview',
    {
      description: catalogDescription('get_object_related_album_preview'),
      inputSchema: withMcpLocaleContext(
        relatedAlbumPreviewQuerySchema.extend({
          object_id: z.string().min(1).describe('Source object id'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getObjectRelatedAlbumPreview.execute(
        args.object_id,
        { limit: args.limit },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
      );
      if (!result) {
        return toolError(`Object not found: ${args.object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_related_album',
    {
      description: catalogDescription('get_object_related_album'),
      inputSchema: withMcpLocaleContext(
        relatedAlbumListQuerySchema.extend({
          object_id: z.string().min(1).describe('Source object id'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getObjectRelatedAlbum.execute(
        args.object_id,
        { limit: args.limit, cursor: args.cursor },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
      );
      if (!result) {
        return toolError(`Object not found: ${args.object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_followers',
    {
      description: catalogDescription('get_object_followers'),
      inputSchema: withMcpLocaleContext(
        userSocialListQuerySchema.extend({
          object_id: z.string().min(1).describe('Object id'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { object_id, sort, skip, limit } = args;
      const result = await deps.getObjectFollowers.execute(
        object_id,
        { sort, skip, limit },
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`Object not found: ${object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_experts',
    {
      description: catalogDescription('get_object_experts'),
      inputSchema: withMcpLocaleContext(
        objectExpertListQuerySchema.extend({
          object_id: z.string().min(1).describe('Object id'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { object_id, skip, limit } = args;
      const result = await deps.getObjectExperts.execute(
        object_id,
        { skip, limit },
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`Object not found: ${object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_favorited_by',
    {
      description: catalogDescription('get_object_favorited_by'),
      inputSchema: withMcpLocaleContext(
        userSocialListQuerySchema.extend({
          object_id: z.string().min(1).describe('Object id'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { object_id, sort, skip, limit } = args;
      const result = await deps.getObjectFavoritedBy.execute(
        object_id,
        { sort, skip, limit },
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`Object not found: ${object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_ownership',
    {
      description: catalogDescription('get_object_ownership'),
      inputSchema: withMcpLocaleContext(
        objectOwnershipQuerySchema.extend({
          object_id: z.string().min(1).describe('Object id'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { object_id, sort, skip, limit, ownership_type } = args;
      const result = await deps.getObjectOwnership.execute(
        object_id,
        { sort, skip, limit, ownership_type },
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`Object not found: ${object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_updates',
    {
      description: catalogDescription('get_object_updates'),
      inputSchema: withMcpLocaleContext(
        objectUpdatesFeedQuerySchema.extend({
          object_id: z.string().min(1).describe('Object id'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { object_id, cursor, limit, update_type, locale: queryLocale, sort } = args;
      const result = await deps.getObjectUpdatesFeed.execute({
        objectId: object_id,
        query: {
          cursor,
          limit,
          update_type,
          locale: queryLocale,
          sort,
        },
        governanceObjectIdFromHeader: ctx.governanceObjectIdFromHeader,
        viewerAccount: ctx.viewerAccount,
      });
      if (!result) {
        return toolError(`Object not found: ${object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_posts',
    {
      description: catalogDescription('get_object_posts'),
      inputSchema: withMcpLocaleContext(
        z.object({
          object_id: z.string().min(1).describe('Object id'),
          limit: z.coerce.number().int().min(1).max(50).default(20),
          cursor: z.string().optional(),
          currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { object_id, limit, cursor, currency } = args;
      const result = await deps.getObjectPostsFeed.execute(
        object_id,
        { limit, cursor, currency },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`Object not found: ${object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_threads',
    {
      description: catalogDescription('get_object_threads'),
      inputSchema: withMcpLocaleContext(
        z.object({
          object_id: z.string().min(1).describe('Object id'),
          limit: z.coerce.number().int().min(1).max(50).default(20),
          cursor: z.string().optional(),
          sort: z.enum(['latest', 'oldest']).default('latest'),
          currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
          authors_only: activityAuthorsFilterFields.authors_only,
          authors_governance_object_id:
            activityAuthorsFilterFields.authors_governance_object_id,
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const {
        object_id,
        limit,
        cursor,
        sort,
        currency,
        authors_only,
        authors_governance_object_id,
      } = args;
      const result = await deps.getObjectThreadsFeed.execute(
        object_id,
        { limit, cursor, sort, currency, authors_only, authors_governance_object_id },
        ctx.viewerAccount,
        ctx.governanceObjectIdFromHeader,
      );
      if (!result) {
        return toolError(`Object not found: ${object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_update_voters',
    {
      description: catalogDescription('get_update_voters'),
      inputSchema: withMcpLocaleContext(
        z.object({
          object_id: z.string().min(1).describe('Object id'),
          update_id: z.string().min(1).describe('Update id'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getUpdateVoters.execute({
        objectId: args.object_id,
        updateId: args.update_id,
        governanceObjectIdFromHeader: ctx.governanceObjectIdFromHeader,
      });
      if (!result) {
        return toolError(`Update not found: ${args.update_id} on object ${args.object_id}`);
      }
      return jsonToolResult(result);
    },
  );
}
