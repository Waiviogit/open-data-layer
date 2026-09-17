import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  activityDedupCheckBodySchema,
  channelListQuerySchema,
  messageHistoryBodySchema,
} from '../../domain/messaging/schemas/messaging.schema';
import { catalogDescription } from '../mcp-tool-catalog';
import type { McpToolDeps } from '../mcp-tool.deps';
import {
  jsonToolResult,
  pickMcpContext,
  toolError,
  withMcpLocaleContext,
} from '../mcp-tool.helpers';

export function registerChannelTools(server: McpServer, deps: McpToolDeps): void {
  server.registerTool(
    'get_channels',
    {
      description: catalogDescription('get_channels'),
      inputSchema: channelListQuerySchema.extend({
        viewer: z.string().min(1).describe('Hive account name of the viewer (required)'),
      }),
    },
    async (args) => {
      const { viewer, kind, limit, cursor } = args;
      return jsonToolResult(
        await deps.getChannels.execute(viewer, { kind, limit, cursor }),
      );
    },
  );

  server.registerTool(
    'get_channel_by_id',
    {
      description: catalogDescription('get_channel_by_id'),
      inputSchema: z.object({
        viewer: z.string().optional().describe('Hive account name of the viewer'),
        channel_id: z.string().min(1).describe('Channel id'),
      }),
    },
    async (args) => {
      const result = await deps.getChannelById.execute(args.channel_id, args.viewer);
      if (!result) {
        return toolError(`Channel not found: ${args.channel_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_channel_by_alias',
    {
      description: catalogDescription('get_channel_by_alias'),
      inputSchema: z.object({
        viewer: z.string().optional().describe('Hive account name of the viewer'),
        alias: z.string().min(1).describe('Channel alias (dm: or obj: prefix)'),
      }),
    },
    async (args) => {
      const result = await deps.getChannelByAlias.execute(args.alias, args.viewer);
      if (!result) {
        return toolError(`Channel not found for alias: ${args.alias}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_channel_messages',
    {
      description: catalogDescription('get_channel_messages'),
      inputSchema: z.object({
        viewer: z.string().optional().describe('Hive account name of the viewer'),
        channel_id: z.string().min(1),
        limit: messageHistoryBodySchema.shape.limit,
        cursor: messageHistoryBodySchema.shape.cursor,
        for_context: messageHistoryBodySchema.shape.for_context,
      }),
    },
    async (args) => {
      const { channel_id, viewer, limit, cursor, for_context } = args;
      const result = await deps.getChannelMessages.execute(
        channel_id,
        { limit, cursor, for_context },
        viewer,
      );
      if (!result) {
        return toolError(`Channel not found: ${channel_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_channel',
    {
      description: catalogDescription('get_object_channel'),
      inputSchema: withMcpLocaleContext(
        z.object({
          object_id: z.string().min(1),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getObjectChannel.execute(
        args.object_id,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`Object channel not found: ${args.object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_object_channel_messages',
    {
      description: catalogDescription('get_object_channel_messages'),
      inputSchema: withMcpLocaleContext(
        z.object({
          object_id: z.string().min(1),
          limit: messageHistoryBodySchema.shape.limit,
          cursor: messageHistoryBodySchema.shape.cursor,
          include_duplicates: messageHistoryBodySchema.shape.include_duplicates,
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { object_id, limit, cursor, include_duplicates } = args;
      const result = await deps.getObjectChannelMessages.execute(
        object_id,
        { limit, cursor, include_duplicates },
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`Object channel not found: ${object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'check_object_activity_duplicate',
    {
      description: catalogDescription('check_object_activity_duplicate'),
      inputSchema: withMcpLocaleContext(
        z.object({
          object_id: z.string().min(1),
          source: activityDedupCheckBodySchema.shape.source,
          original_text: activityDedupCheckBodySchema.shape.original_text.describe(
            'ORIGINAL author caption before rewriting — not the broadcast body',
          ),
          text_simhash: activityDedupCheckBodySchema.shape.text_simhash,
          fp_v: activityDedupCheckBodySchema.shape.fp_v,
          image_phashes: activityDedupCheckBodySchema.shape.image_phashes,
          original_created_at_unix:
            activityDedupCheckBodySchema.shape.original_created_at_unix,
        }),
      ),
    },
    async (args) => {
      const { object_id, ...rawBody } = args;
      const parsed = activityDedupCheckBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        return toolError(parsed.error.message);
      }
      const result = await deps.checkObjectActivityDuplicate.execute(
        object_id,
        parsed.data,
      );
      if (!result) {
        return toolError(`Object not found: ${object_id}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_memo_public_key',
    {
      description: catalogDescription('get_memo_public_key'),
      inputSchema: z.object({
        account: z.string().min(1).describe('Hive account name'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.getMemoPublicKey.execute(args.account);
        return jsonToolResult(result);
      } catch {
        return toolError(`Account not found: ${args.account}`);
      }
    },
  );
}
