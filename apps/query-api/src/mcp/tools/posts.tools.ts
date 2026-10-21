import { SUPPORTED_CURRENCIES } from '@opden-data-layer/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { catalogDescription } from '../mcp-tool-catalog';
import type { McpToolDeps } from '../mcp-tool.deps';
import { VOTERS_PAGE_LIMIT } from '../../domain/feed/feed.constants';
import {
  jsonToolResult,
  pickMcpContext,
  resolveMcpCountry,
  toolError,
  withMcpLocaleContext,
} from '../mcp-tool.helpers';

const postKeyFields = {
  author: z.string().min(1).describe('Post author Hive account name'),
  permlink: z.string().min(1).describe('Post permlink'),
} as const;

const postDiscussionSchema = z.object({
  ...postKeyFields,
  viewer: z.string().optional().describe('Hive account name of the viewer'),
  currency: z
    .enum(SUPPORTED_CURRENCIES)
    .default('USD')
    .describe('Reward display currency (see post-reward.md)'),
});

const postVotersSchema = z.object({
  ...postKeyFields,
  direction: z.enum(['up', 'down']).describe('Vote direction tab'),
  contentType: z
    .enum(['post', 'thread'])
    .default('post')
    .describe('Hive post (default) or Leo/Ecency thread'),
  limit: z.number().int().min(1).max(20).optional().describe('Page size (max 20)'),
  cursor: z.string().optional().describe('Opaque pagination cursor from prior response'),
  currency: z
    .enum(SUPPORTED_CURRENCIES)
    .default('USD')
    .describe('Fiat currency for per-voter value labels'),
});

export function registerPostTools(server: McpServer, deps: McpToolDeps): void {
  server.registerTool(
    'get_post',
    {
      description: catalogDescription('get_post'),
      inputSchema: withMcpLocaleContext(
        z.object({
          ...postKeyFields,
          currency: z
            .enum(SUPPORTED_CURRENCIES)
            .default('USD')
            .describe('Reward display currency (see post-reward.md)'),
          country: z
            .string()
            .trim()
            .max(32)
            .optional()
            .describe('ISO 3166-1 alpha-2 or affiliate geo token; overrides GeoIP when valid'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getPostByKey.execute(
        args.author,
        args.permlink,
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
        args.currency,
        resolveMcpCountry(deps, args.country),
      );
      if (!result) {
        return toolError(`Post not found: ${args.author}/${args.permlink}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_post_discussion',
    {
      description: catalogDescription('get_post_discussion'),
      inputSchema: postDiscussionSchema,
    },
    async (args) => {
      const result = await deps.getPostDiscussion.execute(
        args.author,
        args.permlink,
        args.viewer?.trim() || undefined,
        args.currency,
      );
      if (!result) {
        return toolError(`Discussion not found: ${args.author}/${args.permlink}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_home_feed',
    {
      description: catalogDescription('get_home_feed'),
      inputSchema: withMcpLocaleContext(
        z.object({
          limit: z.number().int().min(1).max(50).optional().describe('Page size (max 50)'),
          cursor: z.string().optional().describe('Opaque pagination cursor from prior response'),
          currency: z
            .enum(SUPPORTED_CURRENCIES)
            .default('USD')
            .describe('Reward display currency (see post-reward.md)'),
        }),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getHomeFeed.execute(
        {
          limit: args.limit ?? 20,
          cursor: args.cursor,
          currency: args.currency,
        },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_post_voters',
    {
      description: catalogDescription('get_post_voters'),
      inputSchema: postVotersSchema,
    },
    async (args) => {
      const result = await deps.getPostVoters.execute(
        args.author,
        args.permlink,
        {
          direction: args.direction,
          contentType: args.contentType,
          limit: args.limit ?? VOTERS_PAGE_LIMIT,
          cursor: args.cursor,
        },
        args.currency,
      );
      if (!result) {
        return toolError(`Voters not found: ${args.author}/${args.permlink}`);
      }
      return jsonToolResult(result);
    },
  );
}
