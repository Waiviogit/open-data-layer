import { Injectable, Logger } from '@nestjs/common';
import { CurrencyQueryService } from '@opden-data-layer/currency';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { GetUserCategoriesEndpoint } from '../domain/categories/get-user-categories.endpoint';
import { GetCategoryObjectsEndpoint } from '../domain/categories/get-category-objects.endpoint';
import {
  GetDiscoverObjectsEndpoint,
  GetDiscoverTagCategoriesEndpoint,
  GetDiscoverUsersEndpoint,
} from '../domain/discover';
import {
  GetPostByKeyEndpoint,
  GetPostDiscussionEndpoint,
  GetPostVotersEndpoint,
  GetUserBlogFeedEndpoint,
  GetUserBlogObjectFiltersEndpoint,
  GetUserCommentsFeedEndpoint,
  GetUserMentionsFeedEndpoint,
  GetUserThreadsFeedEndpoint,
  GetUserActivityEndpoint,
  GetHomeFeedEndpoint,
  GetObjectPostsFeedEndpoint,
  GetObjectThreadsFeedEndpoint,
} from '../domain/feed';
import { GetObjectUpdatesFeedEndpoint } from '../domain/object-updates/get-object-updates-feed.endpoint';
import { GetUpdateVotersEndpoint } from '../domain/object-updates/get-update-voters.endpoint';
import {
  CheckObjectExistsEndpoint,
  GetNestedObjectsEndpoint,
  GetObjectFavoritedByEndpoint,
  GetObjectOwnershipEndpoint,
  GetObjectByIdEndpoint,
  GetObjectFollowersEndpoint,
  GetObjectExpertsEndpoint,
  GetObjectRefListEndpoint,
  GetObjectFieldReferencesSummaryEndpoint,
  GetObjectFieldReferencesByTypeEndpoint,
  GetObjectRelatedAlbumEndpoint,
  GetObjectRelatedAlbumPreviewEndpoint,
  GetObjectOptionsEndpoint,
} from '../domain/objects';
import { GetSearchCountsEndpoint } from '../domain/search/get-search-counts.endpoint';
import { GetSearchEndpoint } from '../domain/search/get-search.endpoint';
import {
  GetUserShopFiltersEndpoint,
  GetUserShopObjectsEndpoint,
  GetUserShopSectionsEndpoint,
} from '../domain/shop';
import {
  GetUserFollowersEndpoint,
  GetUserFollowingEndpoint,
  GetUserFollowingObjectsEndpoint,
  GetUserAuthorityGrantorsEndpoint,
  GetUserAuthorityGranteesEndpoint,
} from '../domain/social';
import {
  GetUserFavoritesEndpoint,
  GetUserFavoritesTypesEndpoint,
  PostUserFavoritesMapEndpoint,
} from '../domain/favorites';
import {
  GetUserExpertiseCountersEndpoint,
  GetUserExpertiseObjectsEndpoint,
} from '../domain/expertise';
import { GetUserProfileEndpoint, GetUserAccountSidebarEndpoint, GetUserNotificationSettingsEndpoint } from '../domain/users';
import {
  GetUserEngineTokenDelegationsEndpoint,
  GetUserHiveHpDelegationsEndpoint,
  GetUserHiveRcDelegationsEndpoint,
  GetUserHiveWalletEndpoint,
  GetUserWaivWalletEndpoint,
  GetUserWaivWalletHistoryEndpoint,
  GetUserEngineWalletEndpoint,
  GetUserEngineWalletHistoryEndpoint,
  GetUserEngineSwapListEndpoint,
  PostUserEngineSwapQuoteEndpoint,
  GetUserEngineDepositAddressEndpoint,
  PostUserEngineWithdrawQuoteEndpoint,
  GetUserHiveWithdrawRangeEndpoint,
  PostUserHiveWithdrawEstimateEndpoint,
  GetHiveAdvancedReportEndpoint,
  UpsertHiveWalletExemptionEndpoint,
} from '../domain/wallet';
import {
  OblArbitrationService,
  OblConversionService,
  OblLedgerService,
  OblOffersService,
  OblRelationshipsService,
} from '../domain/obl';
import {
  CheckActivityDuplicateEndpoint,
  GetChannelsEndpoint,
  GetChannelByIdEndpoint,
  GetChannelByAliasEndpoint,
  GetChannelMessagesEndpoint,
  GetObjectChannelEndpoint,
  GetObjectChannelMessagesEndpoint,
  GetMemoPublicKeyEndpoint,
} from '../domain/messaging';
import { QUERY_API_MCP_INSTRUCTIONS } from './mcp-instructions';
import type { McpToolDeps } from './mcp-tool.deps';
import { registerAllMcpTools } from './register-all-tools';
import { registerQueryMcpResources } from './register-query-mcp-resources';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    private readonly search: GetSearchEndpoint,
    private readonly searchCounts: GetSearchCountsEndpoint,
    private readonly discoverObjects: GetDiscoverObjectsEndpoint,
    private readonly discoverUsers: GetDiscoverUsersEndpoint,
    private readonly discoverTagCategories: GetDiscoverTagCategoriesEndpoint,
    private readonly getObjectById: GetObjectByIdEndpoint,
    private readonly getNestedObjects: GetNestedObjectsEndpoint,
    private readonly checkObjectExists: CheckObjectExistsEndpoint,
    private readonly getObjectRefList: GetObjectRefListEndpoint,
    private readonly getObjectFieldReferencesSummary: GetObjectFieldReferencesSummaryEndpoint,
    private readonly getObjectFieldReferencesByType: GetObjectFieldReferencesByTypeEndpoint,
    private readonly getObjectOptions: GetObjectOptionsEndpoint,
    private readonly getObjectRelatedAlbumPreview: GetObjectRelatedAlbumPreviewEndpoint,
    private readonly getObjectRelatedAlbum: GetObjectRelatedAlbumEndpoint,
    private readonly getObjectFollowers: GetObjectFollowersEndpoint,
    private readonly getObjectExperts: GetObjectExpertsEndpoint,
    private readonly getObjectFavoritedBy: GetObjectFavoritedByEndpoint,
    private readonly getObjectOwnership: GetObjectOwnershipEndpoint,
    private readonly getObjectUpdatesFeed: GetObjectUpdatesFeedEndpoint,
    private readonly getObjectPostsFeed: GetObjectPostsFeedEndpoint,
    private readonly getObjectThreadsFeed: GetObjectThreadsFeedEndpoint,
    private readonly getUpdateVoters: GetUpdateVotersEndpoint,
    private readonly getUserProfile: GetUserProfileEndpoint,
    private readonly getUserNotificationSettings: GetUserNotificationSettingsEndpoint,
    private readonly getUserAccountSidebar: GetUserAccountSidebarEndpoint,
    private readonly getUserBlogFeed: GetUserBlogFeedEndpoint,
    private readonly getUserBlogObjectFilters: GetUserBlogObjectFiltersEndpoint,
    private readonly getUserMentionsFeed: GetUserMentionsFeedEndpoint,
    private readonly getUserThreadsFeed: GetUserThreadsFeedEndpoint,
    private readonly getUserCommentsFeed: GetUserCommentsFeedEndpoint,
    private readonly getUserActivity: GetUserActivityEndpoint,
    private readonly getUserWaivWallet: GetUserWaivWalletEndpoint,
    private readonly getUserWaivWalletHistory: GetUserWaivWalletHistoryEndpoint,
    private readonly getUserEngineWallet: GetUserEngineWalletEndpoint,
    private readonly getUserEngineWalletHistory: GetUserEngineWalletHistoryEndpoint,
    private readonly getUserEngineSwapList: GetUserEngineSwapListEndpoint,
    private readonly postUserEngineSwapQuote: PostUserEngineSwapQuoteEndpoint,
    private readonly getUserEngineDepositAddress: GetUserEngineDepositAddressEndpoint,
    private readonly postUserEngineWithdrawQuote: PostUserEngineWithdrawQuoteEndpoint,
    private readonly getUserEngineTokenDelegations: GetUserEngineTokenDelegationsEndpoint,
    private readonly getUserHiveHpDelegations: GetUserHiveHpDelegationsEndpoint,
    private readonly getUserHiveRcDelegations: GetUserHiveRcDelegationsEndpoint,
    private readonly getUserHiveWallet: GetUserHiveWalletEndpoint,
    private readonly getUserHiveWithdrawRange: GetUserHiveWithdrawRangeEndpoint,
    private readonly postUserHiveWithdrawEstimate: PostUserHiveWithdrawEstimateEndpoint,
    private readonly getHiveAdvancedReport: GetHiveAdvancedReportEndpoint,
    private readonly upsertHiveWalletExemption: UpsertHiveWalletExemptionEndpoint,
    private readonly getUserFollowers: GetUserFollowersEndpoint,
    private readonly getUserFollowing: GetUserFollowingEndpoint,
    private readonly getUserFollowingObjects: GetUserFollowingObjectsEndpoint,
    private readonly getUserAuthorityGrantors: GetUserAuthorityGrantorsEndpoint,
    private readonly getUserAuthorityGrantees: GetUserAuthorityGranteesEndpoint,
    private readonly getUserFavoritesTypes: GetUserFavoritesTypesEndpoint,
    private readonly getUserFavorites: GetUserFavoritesEndpoint,
    private readonly postUserFavoritesMap: PostUserFavoritesMapEndpoint,
    private readonly getUserExpertiseCounters: GetUserExpertiseCountersEndpoint,
    private readonly getUserExpertiseObjects: GetUserExpertiseObjectsEndpoint,
    private readonly getUserCategories: GetUserCategoriesEndpoint,
    private readonly getCategoryObjects: GetCategoryObjectsEndpoint,
    private readonly getUserShopObjects: GetUserShopObjectsEndpoint,
    private readonly getUserShopSections: GetUserShopSectionsEndpoint,
    private readonly getUserShopFilters: GetUserShopFiltersEndpoint,
    private readonly getPostByKey: GetPostByKeyEndpoint,
    private readonly getPostDiscussion: GetPostDiscussionEndpoint,
    private readonly getPostVoters: GetPostVotersEndpoint,
    private readonly getHomeFeed: GetHomeFeedEndpoint,
    private readonly currencyQueries: CurrencyQueryService,
    private readonly oblOffers: OblOffersService,
    private readonly oblLedger: OblLedgerService,
    private readonly oblConversion: OblConversionService,
    private readonly oblRelationships: OblRelationshipsService,
    private readonly oblArbitration: OblArbitrationService,
    private readonly getChannels: GetChannelsEndpoint,
    private readonly getChannelById: GetChannelByIdEndpoint,
    private readonly getChannelByAlias: GetChannelByAliasEndpoint,
    private readonly getChannelMessages: GetChannelMessagesEndpoint,
    private readonly getObjectChannel: GetObjectChannelEndpoint,
    private readonly getObjectChannelMessages: GetObjectChannelMessagesEndpoint,
    private readonly checkObjectActivityDuplicate: CheckActivityDuplicateEndpoint,
    private readonly getMemoPublicKey: GetMemoPublicKeyEndpoint,
  ) {}

  private buildDeps(): McpToolDeps {
    return {
      search: this.search,
      searchCounts: this.searchCounts,
      discoverObjects: this.discoverObjects,
      discoverUsers: this.discoverUsers,
      discoverTagCategories: this.discoverTagCategories,
      getObjectById: this.getObjectById,
      getNestedObjects: this.getNestedObjects,
      checkObjectExists: this.checkObjectExists,
      getObjectRefList: this.getObjectRefList,
      getObjectFieldReferencesSummary: this.getObjectFieldReferencesSummary,
      getObjectFieldReferencesByType: this.getObjectFieldReferencesByType,
      getObjectOptions: this.getObjectOptions,
      getObjectRelatedAlbumPreview: this.getObjectRelatedAlbumPreview,
      getObjectRelatedAlbum: this.getObjectRelatedAlbum,
      getObjectFollowers: this.getObjectFollowers,
      getObjectExperts: this.getObjectExperts,
      getObjectFavoritedBy: this.getObjectFavoritedBy,
      getObjectOwnership: this.getObjectOwnership,
      getObjectUpdatesFeed: this.getObjectUpdatesFeed,
      getObjectPostsFeed: this.getObjectPostsFeed,
      getObjectThreadsFeed: this.getObjectThreadsFeed,
      getUpdateVoters: this.getUpdateVoters,
      getUserProfile: this.getUserProfile,
      getUserNotificationSettings: this.getUserNotificationSettings,
      getUserAccountSidebar: this.getUserAccountSidebar,
      getUserBlogFeed: this.getUserBlogFeed,
      getUserBlogObjectFilters: this.getUserBlogObjectFilters,
      getUserMentionsFeed: this.getUserMentionsFeed,
      getUserThreadsFeed: this.getUserThreadsFeed,
      getUserCommentsFeed: this.getUserCommentsFeed,
      getUserActivity: this.getUserActivity,
      getUserWaivWallet: this.getUserWaivWallet,
      getUserWaivWalletHistory: this.getUserWaivWalletHistory,
      getUserEngineWallet: this.getUserEngineWallet,
      getUserEngineWalletHistory: this.getUserEngineWalletHistory,
      getUserEngineSwapList: this.getUserEngineSwapList,
      postUserEngineSwapQuote: this.postUserEngineSwapQuote,
      getUserEngineDepositAddress: this.getUserEngineDepositAddress,
      postUserEngineWithdrawQuote: this.postUserEngineWithdrawQuote,
      getUserEngineTokenDelegations: this.getUserEngineTokenDelegations,
      getUserHiveHpDelegations: this.getUserHiveHpDelegations,
      getUserHiveRcDelegations: this.getUserHiveRcDelegations,
      getUserHiveWallet: this.getUserHiveWallet,
      getUserHiveWithdrawRange: this.getUserHiveWithdrawRange,
      postUserHiveWithdrawEstimate: this.postUserHiveWithdrawEstimate,
      getHiveAdvancedReport: this.getHiveAdvancedReport,
      upsertHiveWalletExemption: this.upsertHiveWalletExemption,
      getUserFollowers: this.getUserFollowers,
      getUserFollowing: this.getUserFollowing,
      getUserFollowingObjects: this.getUserFollowingObjects,
      getUserAuthorityGrantors: this.getUserAuthorityGrantors,
      getUserAuthorityGrantees: this.getUserAuthorityGrantees,
      getUserFavoritesTypes: this.getUserFavoritesTypes,
      getUserFavorites: this.getUserFavorites,
      postUserFavoritesMap: this.postUserFavoritesMap,
      getUserExpertiseCounters: this.getUserExpertiseCounters,
      getUserExpertiseObjects: this.getUserExpertiseObjects,
      getUserCategories: this.getUserCategories,
      getCategoryObjects: this.getCategoryObjects,
      getUserShopObjects: this.getUserShopObjects,
      getUserShopSections: this.getUserShopSections,
      getUserShopFilters: this.getUserShopFilters,
      getPostByKey: this.getPostByKey,
      getPostDiscussion: this.getPostDiscussion,
      getPostVoters: this.getPostVoters,
      getHomeFeed: this.getHomeFeed,
      currencyQueries: this.currencyQueries,
      oblOffers: this.oblOffers,
      oblLedger: this.oblLedger,
      oblConversion: this.oblConversion,
      oblRelationships: this.oblRelationships,
      oblArbitration: this.oblArbitration,
      getChannels: this.getChannels,
      getChannelById: this.getChannelById,
      getChannelByAlias: this.getChannelByAlias,
      getChannelMessages: this.getChannelMessages,
      getObjectChannel: this.getObjectChannel,
      getObjectChannelMessages: this.getObjectChannelMessages,
      checkObjectActivityDuplicate: this.checkObjectActivityDuplicate,
      getMemoPublicKey: this.getMemoPublicKey,
    };
  }

  private createServer(): McpServer {
    const server = new McpServer(
      { name: 'query-api', version: '1.0.0' },
      {
        capabilities: { tools: {}, resources: {}, prompts: {} },
        instructions: QUERY_API_MCP_INSTRUCTIONS,
      },
    );
    registerAllMcpTools(server, this.buildDeps());
    registerQueryMcpResources(server);
    return server;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = this.createServer();

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.logger.error((error as Error).message);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error' },
          id: null,
        });
      }
    } finally {
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  }
}
