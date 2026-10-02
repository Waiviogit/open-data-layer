import { SUPPORTED_CURRENCIES } from '@opden-data-layer/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { userCategoriesQuerySchema } from '../../domain/categories/categories-query.schema';
import { shopFiltersQuerySchema, shopObjectsQuerySchema, shopSectionsQuerySchema } from '../../domain/shop/shop.schema';
import {
  userFollowingObjectsQuerySchema,
  userSocialListQuerySchema,
} from '../../domain/social/user-social-list.schema';
import { userAccountAuthListQuerySchema } from '../../domain/social/user-account-auth-list.schema';
import { userFavoritesMapBodySchema, toUserFavoritesMapBody } from '../../domain/favorites/post-user-favorites-map.schema';
import { userFavoritesQuerySchema } from '../../domain/favorites/favorites.schema';
import { userExpertiseObjectsQuerySchema } from '../../domain/expertise/expertise.schema';
import { objectActivityMessageHistoryBodySchema } from '../../domain/messaging/schemas/messaging.schema';
import { userActivityBodyFieldsSchema } from '../../domain/feed/schemas/user-activity.schema';
import {
  hiveAdvancedReportBodySchema,
  hiveWalletExemptionBodySchema,
} from '../../domain/wallet/schemas/hive-advanced-report.schema';
import { catalogDescription } from '../mcp-tool-catalog';
import type { McpToolDeps } from '../mcp-tool.deps';
import {
  jsonToolResult,
  pickMcpContext,
  toolError,
  withMcpLocaleContext,
} from '../mcp-tool.helpers';

const accountField = {
  account: z.string().min(1).describe('Hive account name'),
} as const;

const userBlogFeedMcpSchema = withMcpLocaleContext(
  z.object({
    ...accountField,
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
    object_ids: z
      .array(z.string().min(1))
      .max(20)
      .optional()
      .default([])
      .describe('AND filter: posts must link to every object_id'),
  }),
);

const userMentionsFeedMcpSchema = withMcpLocaleContext(
  z.object({
    ...accountField,
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
  }),
);

const userBlogObjectFiltersMcpSchema = withMcpLocaleContext(
  z.object({
    ...accountField,
    objects: z
      .array(z.string().min(1))
      .optional()
      .default([])
      .describe('Active object_id filters (AND) for facet narrowing'),
  }),
);

const userThreadsFeedMcpSchema = z.object({
  ...accountField,
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  sort: z.enum(['latest', 'oldest']).default('latest'),
  currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
  viewer: z.string().optional().describe('Hive account name of the viewer'),
});

const userActivityMcpSchema = userActivityBodyFieldsSchema.extend({
  ...accountField,
});

export function registerUserTools(server: McpServer, deps: McpToolDeps): void {
  server.registerTool(
    'get_user_profile',
    {
      description: catalogDescription('get_user_profile'),
      inputSchema: z.object({
        ...accountField,
        viewer: z.string().optional().describe('Hive account name of the viewer'),
      }),
    },
    async (args) => {
      const result = await deps.getUserProfile.execute(args.account, args.viewer);
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_notification_settings',
    {
      description: catalogDescription('get_user_notification_settings'),
      inputSchema: z.object({
        ...accountField,
        viewer: z.string().describe('Hive account name of the viewer; must match account'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.getUserNotificationSettings.execute(
          args.account,
          args.viewer,
        );
        return jsonToolResult(result);
      } catch {
        return toolError('Forbidden or unavailable');
      }
    },
  );

  server.registerTool(
    'get_user_account_sidebar',
    {
      description: catalogDescription('get_user_account_sidebar'),
      inputSchema: z.object({ ...accountField }),
    },
    async (args) => {
      const result = await deps.getUserAccountSidebar.execute(args.account);
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_blog',
    {
      description: catalogDescription('get_user_blog'),
      inputSchema: userBlogFeedMcpSchema,
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { account, limit, cursor, currency, object_ids } = args;
      const result = await deps.getUserBlogFeed.execute(
        account,
        { limit, cursor, currency, object_ids },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_blog_object_filters',
    {
      description: catalogDescription('get_user_blog_object_filters'),
      inputSchema: userBlogObjectFiltersMcpSchema,
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { account, objects } = args;
      const result = await deps.getUserBlogObjectFilters.execute(
        account,
        { objects },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_mentions',
    {
      description: catalogDescription('get_user_mentions'),
      inputSchema: userMentionsFeedMcpSchema,
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { account, limit, cursor, currency } = args;
      const result = await deps.getUserMentionsFeed.execute(
        account,
        { limit, cursor, currency, object_ids: [] },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_threads',
    {
      description: catalogDescription('get_user_threads'),
      inputSchema: userThreadsFeedMcpSchema,
    },
    async (args) => {
      const { account, limit, cursor, sort, currency, viewer } = args;
      const result = await deps.getUserThreadsFeed.execute(
        account,
        { limit, cursor, sort, currency },
        viewer,
      );
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_comments',
    {
      description: catalogDescription('get_user_comments'),
      inputSchema: userThreadsFeedMcpSchema,
    },
    async (args) => {
      const { account, limit, cursor, sort, currency, viewer } = args;
      const result = await deps.getUserCommentsFeed.execute(
        account,
        { limit, cursor, sort, currency },
        viewer,
      );
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_activity',
    {
      description: catalogDescription('get_user_activity'),
      inputSchema: userActivityMcpSchema,
    },
    async (args) => {
      const { account, limit, cursor, filters } = args;
      const result = await deps.getUserActivity.execute(account, {
        limit,
        cursor,
        filters,
      });
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_waiv_wallet',
    {
      description: catalogDescription('get_user_waiv_wallet'),
      inputSchema: z.object({ ...accountField }),
    },
    async (args) => {
      const result = await deps.getUserWaivWallet.execute(args.account);
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_waiv_wallet_history',
    {
      description: catalogDescription('get_user_waiv_wallet_history'),
      inputSchema: z.object({
        ...accountField,
        limit: z.number().int().min(1).max(500).optional().describe('Page size (default 20)'),
        cursor: z.string().optional().describe('Pagination cursor from previous response'),
        showRewards: z
          .boolean()
          .optional()
          .describe('Include author/curation/beneficiary reward rows (default false)'),
      }),
    },
    async (args) => {
      const result = await deps.getUserWaivWalletHistory.execute(args.account, {
        limit: args.limit,
        cursor: args.cursor,
        showRewards: args.showRewards,
      });
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_engine_wallet',
    {
      description: catalogDescription('get_user_engine_wallet'),
      inputSchema: z.object({ ...accountField }),
    },
    async (args) => {
      const result = await deps.getUserEngineWallet.execute(args.account);
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_engine_wallet_history',
    {
      description: catalogDescription('get_user_engine_wallet_history'),
      inputSchema: z.object({
        ...accountField,
        limit: z.number().int().min(1).max(500).optional().describe('Page size (default 20)'),
        cursor: z.string().optional().describe('Pagination cursor from previous response'),
      }),
    },
    async (args) => {
      const result = await deps.getUserEngineWalletHistory.execute(args.account, {
        limit: args.limit,
        cursor: args.cursor,
      });
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_engine_swap_list',
    {
      description: catalogDescription('get_user_engine_swap_list'),
      inputSchema: z.object({ ...accountField }),
    },
    async (args) => {
      const result = await deps.getUserEngineSwapList.execute(args.account);
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'post_user_engine_swap_quote',
    {
      description: catalogDescription('post_user_engine_swap_quote'),
      inputSchema: z.object({
        ...accountField,
        fromSymbol: z.string().min(1),
        toSymbol: z.string().min(1),
        amountIn: z.string().min(1),
        direction: z.enum(['exactInput', 'exactOutput']).optional(),
        slippage: z.number().min(0).max(1).optional(),
      }),
    },
    async (args) => {
      const result = await deps.postUserEngineSwapQuote.execute(args.account, {
        fromSymbol: args.fromSymbol,
        toSymbol: args.toSymbol,
        amountIn: args.amountIn,
        direction: args.direction ?? 'exactInput',
        slippage: args.slippage,
      });
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_engine_deposit_address',
    {
      description: catalogDescription('get_user_engine_deposit_address'),
      inputSchema: z.object({
        ...accountField,
        symbol: z.string().min(1).describe('Deposit token symbol (e.g. HIVE, BTC)'),
      }),
    },
    async (args) => {
      const result = await deps.getUserEngineDepositAddress.execute(args.account, {
        symbol: args.symbol,
      });
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'post_user_engine_withdraw_quote',
    {
      description: catalogDescription('post_user_engine_withdraw_quote'),
      inputSchema: z.object({
        ...accountField,
        inputSymbol: z.string().min(1),
        outputSymbol: z.string().min(1),
        quantity: z.string().min(1),
        address: z.string().optional(),
        previewOnly: z.boolean().optional(),
      }),
    },
    async (args) => {
      const result = await deps.postUserEngineWithdrawQuote.execute(args.account, {
        inputSymbol: args.inputSymbol,
        outputSymbol: args.outputSymbol,
        quantity: args.quantity,
        address: args.address,
        previewOnly: args.previewOnly ?? false,
      });
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_engine_token_delegations',
    {
      description: catalogDescription('get_user_engine_token_delegations'),
      inputSchema: z.object({
        ...accountField,
        symbol: z.string().min(1).describe('Hive Engine token symbol (e.g. WAIV)'),
      }),
    },
    async (args) => {
      const result = await deps.getUserEngineTokenDelegations.execute(
        args.account,
        args.symbol,
      );
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_hive_wallet',
    {
      description: catalogDescription('get_user_hive_wallet'),
      inputSchema: z.object({ ...accountField }),
    },
    async (args) => {
      const result = await deps.getUserHiveWallet.execute(args.account);
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_hive_hp_delegations',
    {
      description: catalogDescription('get_user_hive_hp_delegations'),
      inputSchema: z.object({ ...accountField }),
    },
    async (args) => {
      const result = await deps.getUserHiveHpDelegations.execute(args.account);
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_hive_rc_delegations',
    {
      description: catalogDescription('get_user_hive_rc_delegations'),
      inputSchema: z.object({ ...accountField }),
    },
    async (args) => {
      const result = await deps.getUserHiveRcDelegations.execute(args.account);
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_hive_withdraw_range',
    {
      description: catalogDescription('get_user_hive_withdraw_range'),
      inputSchema: z.object({
        ...accountField,
        outputCoinType: z.enum(['btc', 'ltc', 'eth']),
      }),
    },
    async (args) => {
      const result = await deps.getUserHiveWithdrawRange.execute(args.account, {
        outputCoinType: args.outputCoinType,
      });
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'post_user_hive_withdraw_estimate',
    {
      description: catalogDescription('post_user_hive_withdraw_estimate'),
      inputSchema: z.object({
        ...accountField,
        amount: z.coerce.number().positive(),
        outputCoinType: z.enum(['btc', 'ltc', 'eth']),
      }),
    },
    async (args) => {
      const result = await deps.postUserHiveWithdrawEstimate.execute(args.account, {
        amount: args.amount,
        outputCoinType: args.outputCoinType,
      });
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'post_hive_advanced_report',
    {
      description: catalogDescription('post_hive_advanced_report'),
      inputSchema: hiveAdvancedReportBodySchema,
    },
    async (args) => {
      try {
        const result = await deps.getHiveAdvancedReport.execute(args);
        return jsonToolResult(result);
      } catch (e) {
        return toolError((e as Error).message);
      }
    },
  );

  server.registerTool(
    'post_hive_wallet_exemption',
    {
      description: catalogDescription('post_hive_wallet_exemption'),
      inputSchema: hiveWalletExemptionBodySchema,
    },
    async (args) => {
      const result = await deps.upsertHiveWalletExemption.execute(args);
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_followers',
    {
      description: catalogDescription('get_user_followers'),
      inputSchema: userSocialListQuerySchema.extend({
        ...accountField,
        viewer: z.string().optional().describe('Hive account name of the viewer'),
      }),
    },
    async (args) => {
      const { account, sort, skip, limit, viewer } = args;
      const result = await deps.getUserFollowers.execute(
        account,
        { sort, skip, limit },
        viewer,
      );
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_following',
    {
      description: catalogDescription('get_user_following'),
      inputSchema: userSocialListQuerySchema.extend({
        ...accountField,
        viewer: z.string().optional().describe('Hive account name of the viewer'),
      }),
    },
    async (args) => {
      const { account, sort, skip, limit, viewer } = args;
      const result = await deps.getUserFollowing.execute(
        account,
        { sort, skip, limit },
        viewer,
      );
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_following_objects',
    {
      description: catalogDescription('get_user_following_objects'),
      inputSchema: withMcpLocaleContext(
        userFollowingObjectsQuerySchema.extend(accountField),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { account, sort, skip, limit } = args;
      const result = await deps.getUserFollowingObjects.execute(
        account,
        { sort, skip, limit },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_followed_objects_messages',
    {
      description: catalogDescription('get_followed_objects_messages'),
      inputSchema: withMcpLocaleContext(
        objectActivityMessageHistoryBodySchema.extend(accountField),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const {
        account,
        limit,
        cursor,
        for_context,
        include_duplicates,
        authors_only,
        authors_governance_object_id,
      } = args;
      const result = await deps.getFollowedObjectsMessages.execute(
        account,
        {
          limit,
          cursor,
          for_context,
          include_duplicates,
          authors_only,
          authors_governance_object_id,
        },
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_authority_grantors',
    {
      description: catalogDescription('get_user_authority_grantors'),
      inputSchema: userAccountAuthListQuerySchema.extend(accountField),
    },
    async (args) => {
      const { account, type, sort, skip, limit } = args;
      const result = await deps.getUserAuthorityGrantors.execute(account, {
        type,
        sort,
        skip,
        limit,
      });
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_authority_grantees',
    {
      description: catalogDescription('get_user_authority_grantees'),
      inputSchema: userAccountAuthListQuerySchema.extend(accountField),
    },
    async (args) => {
      const { account, type, sort, skip, limit } = args;
      const result = await deps.getUserAuthorityGrantees.execute(account, {
        type,
        sort,
        skip,
        limit,
      });
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_favorites_types',
    {
      description: catalogDescription('get_user_favorites_types'),
      inputSchema: z.object(accountField),
    },
    async (args) => {
      const result = await deps.getUserFavoritesTypes.execute(args.account);
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_favorites',
    {
      description: catalogDescription('get_user_favorites'),
      inputSchema: withMcpLocaleContext(
        userFavoritesQuerySchema.extend(accountField),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { account, objectType, skip, limit } = args;
      const result = await deps.getUserFavorites.execute(
        account,
        { objectType, skip, limit },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'post_user_favorites_map',
    {
      description: catalogDescription('post_user_favorites_map'),
      inputSchema: withMcpLocaleContext(
        userFavoritesMapBodySchema.extend(accountField),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { account, box, objectTypes, skip, limit } = args;
      const result = await deps.postUserFavoritesMap.execute(
        account,
        toUserFavoritesMapBody({ box, objectTypes, skip, limit }),
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      return jsonToolResult(result ?? { items: [], hasMore: false });
    },
  );

  server.registerTool(
    'get_user_expertise_counters',
    {
      description: catalogDescription('get_user_expertise_counters'),
      inputSchema: z.object(accountField),
    },
    async (args) => {
      const result = await deps.getUserExpertiseCounters.execute(args.account);
      if (!result) {
        return toolError(`User not found: ${args.account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_expertise_objects',
    {
      description: catalogDescription('get_user_expertise_objects'),
      inputSchema: withMcpLocaleContext(
        userExpertiseObjectsQuerySchema.extend(accountField),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { account, scope, skip, limit } = args;
      const result = await deps.getUserExpertiseObjects.execute(
        account,
        { scope, skip, limit },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      if (!result) {
        return toolError(`User not found: ${account}`);
      }
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_categories',
    {
      description: catalogDescription('get_user_categories'),
      inputSchema: userCategoriesQuerySchema.extend(accountField),
    },
    async (args) => {
      const { account, types, path, excluded, name } = args;
      const result = await deps.getUserCategories.execute(account, {
        types,
        path,
        excluded,
        name,
      });
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_shop_filters',
    {
      description: catalogDescription('get_user_shop_filters'),
      inputSchema: shopFiltersQuerySchema.extend(accountField),
    },
    async (args) => {
      const { account, types, categoryPath, uncategorizedOnly, tags, rating } = args;
      const result = await deps.getUserShopFilters.execute(account, {
        types,
        categoryPath,
        uncategorizedOnly,
        tags,
        rating,
      });
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_shop_objects',
    {
      description: catalogDescription('get_user_shop_objects'),
      inputSchema: withMcpLocaleContext(
        shopObjectsQuerySchema.extend(accountField),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { account, types, categoryPath, uncategorizedOnly, limit, cursor, tags, rating } = args;
      const result = await deps.getUserShopObjects.execute(
        account,
        { types, categoryPath, uncategorizedOnly, limit, cursor, tags, rating },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    'get_user_shop_sections',
    {
      description: catalogDescription('get_user_shop_sections'),
      inputSchema: withMcpLocaleContext(
        shopSectionsQuerySchema.extend(accountField),
      ),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const { account, types, path, cursor, sectionLimit, name, tags, rating } = args;
      const result = await deps.getUserShopSections.execute(
        account,
        { types, path, cursor, sectionLimit, name, tags, rating },
        ctx.locale,
        ctx.governanceObjectIdFromHeader,
        ctx.viewerAccount,
      );
      return jsonToolResult(result);
    },
  );
}
