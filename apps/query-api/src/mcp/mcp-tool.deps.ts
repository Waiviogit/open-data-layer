import type { CurrencyQueryService } from '@opden-data-layer/currency';
import type {
  OblConversionService,
  OblLedgerService,
  OblOffersService,
  OblRelationshipsService,
  OblArbitrationService,
} from '../domain/obl';
import type { GetDiscoverObjectsEndpoint } from '../domain/discover/get-discover-objects.endpoint';
import type { GetDiscoverTagCategoriesEndpoint } from '../domain/discover/get-discover-tag-categories.endpoint';
import type { GetDiscoverUsersEndpoint } from '../domain/discover/get-discover-users.endpoint';
import type {
  GetPostByKeyEndpoint,
  GetPostDiscussionEndpoint,
  GetPostVotersEndpoint,
  GetUserBlogFeedEndpoint,
  GetUserBlogObjectFiltersEndpoint,
  GetObjectPostsFeedEndpoint,
  GetObjectThreadsFeedEndpoint,
  GetUserCommentsFeedEndpoint,
  GetUserMentionsFeedEndpoint,
  GetUserThreadsFeedEndpoint,
  GetUserActivityEndpoint,
  GetHomeFeedEndpoint,
} from '../domain/feed';
import type { GetObjectUpdatesFeedEndpoint } from '../domain/object-updates/get-object-updates-feed.endpoint';
import type { GetUpdateVotersEndpoint } from '../domain/object-updates/get-update-voters.endpoint';
import type {
  CheckObjectExistsEndpoint,
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
  GetNestedObjectsEndpoint,
} from '../domain/objects';
import type { GetSearchCountsEndpoint } from '../domain/search/get-search-counts.endpoint';
import type { GetSearchEndpoint } from '../domain/search/get-search.endpoint';
import type { GetUserCategoriesEndpoint } from '../domain/categories/get-user-categories.endpoint';
import type { GetCategoryObjectsEndpoint } from '../domain/categories/get-category-objects.endpoint';
import type {
  GetUserShopFiltersEndpoint,
  GetUserShopObjectsEndpoint,
  GetUserShopSectionsEndpoint,
} from '../domain/shop';
import type {
  GetUserFollowersEndpoint,
  GetUserFollowingEndpoint,
  GetUserFollowingObjectsEndpoint,
  GetUserAuthorityGrantorsEndpoint,
  GetUserAuthorityGranteesEndpoint,
} from '../domain/social';
import type {
  GetUserFavoritesEndpoint,
  GetUserFavoritesTypesEndpoint,
  PostUserFavoritesMapEndpoint,
} from '../domain/favorites';
import type {
  GetUserExpertiseCountersEndpoint,
  GetUserExpertiseObjectsEndpoint,
} from '../domain/expertise';
import type { GetMemoPublicKeyEndpoint } from '../domain/messaging/get-memo-public-key.endpoint';
import type { GetChannelsEndpoint } from '../domain/messaging/get-channels.endpoint';
import type { GetChannelByIdEndpoint } from '../domain/messaging/get-channel-by-id.endpoint';
import type { GetChannelByAliasEndpoint } from '../domain/messaging/get-channel-by-alias.endpoint';
import type { GetChannelMessagesEndpoint } from '../domain/messaging/get-channel-messages.endpoint';
import type { CheckActivityDuplicateEndpoint } from '../domain/messaging/check-activity-duplicate.endpoint';
import type {
  GetObjectChannelEndpoint,
  GetObjectChannelMessagesEndpoint,
} from '../domain/messaging/get-object-channel.endpoint';
import type { GetUserProfileEndpoint, GetUserAccountSidebarEndpoint, GetUserNotificationSettingsEndpoint } from '../domain/users';
import type {
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

export interface McpToolDeps {
  search: GetSearchEndpoint;
  searchCounts: GetSearchCountsEndpoint;
  discoverObjects: GetDiscoverObjectsEndpoint;
  discoverUsers: GetDiscoverUsersEndpoint;
  discoverTagCategories: GetDiscoverTagCategoriesEndpoint;
  getObjectById: GetObjectByIdEndpoint;
  getNestedObjects: GetNestedObjectsEndpoint;
  checkObjectExists: CheckObjectExistsEndpoint;
  getObjectRefList: GetObjectRefListEndpoint;
  getObjectFieldReferencesSummary: GetObjectFieldReferencesSummaryEndpoint;
  getObjectFieldReferencesByType: GetObjectFieldReferencesByTypeEndpoint;
  getObjectOptions: GetObjectOptionsEndpoint;
  getObjectRelatedAlbumPreview: GetObjectRelatedAlbumPreviewEndpoint;
  getObjectRelatedAlbum: GetObjectRelatedAlbumEndpoint;
  getObjectFollowers: GetObjectFollowersEndpoint;
  getObjectExperts: GetObjectExpertsEndpoint;
  getObjectFavoritedBy: GetObjectFavoritedByEndpoint;
  getObjectOwnership: GetObjectOwnershipEndpoint;
  getObjectUpdatesFeed: GetObjectUpdatesFeedEndpoint;
  getObjectPostsFeed: GetObjectPostsFeedEndpoint;
  getObjectThreadsFeed: GetObjectThreadsFeedEndpoint;
  getUpdateVoters: GetUpdateVotersEndpoint;
  getUserProfile: GetUserProfileEndpoint;
  getUserNotificationSettings: GetUserNotificationSettingsEndpoint;
  getUserAccountSidebar: GetUserAccountSidebarEndpoint;
  getUserBlogFeed: GetUserBlogFeedEndpoint;
  getUserBlogObjectFilters: GetUserBlogObjectFiltersEndpoint;
  getUserMentionsFeed: GetUserMentionsFeedEndpoint;
  getUserThreadsFeed: GetUserThreadsFeedEndpoint;
  getUserCommentsFeed: GetUserCommentsFeedEndpoint;
  getUserActivity: GetUserActivityEndpoint;
  getHomeFeed: GetHomeFeedEndpoint;
  getUserWaivWallet: GetUserWaivWalletEndpoint;
  getUserWaivWalletHistory: GetUserWaivWalletHistoryEndpoint;
  getUserEngineWallet: GetUserEngineWalletEndpoint;
  getUserEngineWalletHistory: GetUserEngineWalletHistoryEndpoint;
  getUserEngineSwapList: GetUserEngineSwapListEndpoint;
  postUserEngineSwapQuote: PostUserEngineSwapQuoteEndpoint;
  getUserEngineDepositAddress: GetUserEngineDepositAddressEndpoint;
  postUserEngineWithdrawQuote: PostUserEngineWithdrawQuoteEndpoint;
  getUserEngineTokenDelegations: GetUserEngineTokenDelegationsEndpoint;
  getUserHiveHpDelegations: GetUserHiveHpDelegationsEndpoint;
  getUserHiveRcDelegations: GetUserHiveRcDelegationsEndpoint;
  getUserHiveWallet: GetUserHiveWalletEndpoint;
  getUserHiveWithdrawRange: GetUserHiveWithdrawRangeEndpoint;
  postUserHiveWithdrawEstimate: PostUserHiveWithdrawEstimateEndpoint;
  getHiveAdvancedReport: GetHiveAdvancedReportEndpoint;
  upsertHiveWalletExemption: UpsertHiveWalletExemptionEndpoint;
  getUserFollowers: GetUserFollowersEndpoint;
  getUserFollowing: GetUserFollowingEndpoint;
  getUserFollowingObjects: GetUserFollowingObjectsEndpoint;
  getUserAuthorityGrantors: GetUserAuthorityGrantorsEndpoint;
  getUserAuthorityGrantees: GetUserAuthorityGranteesEndpoint;
  getUserFavoritesTypes: GetUserFavoritesTypesEndpoint;
  getUserFavorites: GetUserFavoritesEndpoint;
  postUserFavoritesMap: PostUserFavoritesMapEndpoint;
  getUserExpertiseCounters: GetUserExpertiseCountersEndpoint;
  getUserExpertiseObjects: GetUserExpertiseObjectsEndpoint;
  getUserCategories: GetUserCategoriesEndpoint;
  getCategoryObjects: GetCategoryObjectsEndpoint;
  getUserShopObjects: GetUserShopObjectsEndpoint;
  getUserShopSections: GetUserShopSectionsEndpoint;
  getUserShopFilters: GetUserShopFiltersEndpoint;
  getPostByKey: GetPostByKeyEndpoint;
  getPostDiscussion: GetPostDiscussionEndpoint;
  getPostVoters: GetPostVotersEndpoint;
  currencyQueries: CurrencyQueryService;
  oblOffers: OblOffersService;
  oblLedger: OblLedgerService;
  oblConversion: OblConversionService;
  oblRelationships: OblRelationshipsService;
  oblArbitration: OblArbitrationService;
  getChannels: GetChannelsEndpoint;
  getChannelById: GetChannelByIdEndpoint;
  getChannelByAlias: GetChannelByAliasEndpoint;
  getChannelMessages: GetChannelMessagesEndpoint;
  getObjectChannel: GetObjectChannelEndpoint;
  getObjectChannelMessages: GetObjectChannelMessagesEndpoint;
  checkObjectActivityDuplicate: CheckActivityDuplicateEndpoint;
  getMemoPublicKey: GetMemoPublicKeyEndpoint;
}
