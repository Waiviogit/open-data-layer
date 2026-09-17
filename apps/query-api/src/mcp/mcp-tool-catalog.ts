/** Single source of truth for query-api MCP tool metadata (catalog resource + tests). */
export interface QueryMcpToolCatalogEntry {
  name: string;
  description: string;
  httpEquivalent?: string;
  specPath?: string;
}

export const QUERY_MCP_ROUTING_SKILL_PATH = 'docs/skills/query-api-mcp-routing.md';

export const QUERY_MCP_TOOL_CATALOG: readonly QueryMcpToolCatalogEntry[] = [
  {
    name: 'search',
    description:
      'Predictive search for objects and users (live data). Use for header-style lookup; see search.md for counts vs results.',
    httpEquivalent: 'GET /query/v1/search',
    specPath: 'docs/apps/query-api/spec/search.md',
  },
  {
    name: 'search_counts',
    description:
      'Tab counts for search (objects by type + users). Pair with search when UI needs totals.',
    httpEquivalent: 'GET /query/v1/search/counts',
    specPath: 'docs/apps/query-api/spec/search.md',
  },
  {
    name: 'discover_objects',
    description:
      'Browse objects by type, tags (AND), sort, optional text query, and optional map bounding box (swLng,swLat,neLng,neLat). Use for catalog/discover pages, not quick search.',
    httpEquivalent: 'GET /query/v1/discover/objects',
    specPath: 'docs/apps/query-api/spec/search.md',
  },
  {
    name: 'discover_users',
    description: 'Browse users with optional text query and cursor pagination.',
    httpEquivalent: 'GET /query/v1/discover/users',
  },
  {
    name: 'discover_tag_categories',
    description: 'Tag category facets for an object type (discover filters).',
    httpEquivalent: 'GET /query/v1/discover/tag-categories',
  },
  {
    name: 'resolve_object',
    description:
      'Resolve one object with governance masking and optional update_types filter (empty = all present updates).',
    httpEquivalent: 'POST /query/v1/objects/resolve',
    specPath: 'docs/apps/query-api/spec/objects-resolve.md',
  },
  {
    name: 'resolve_nested_objects',
    description:
      'Batch lightweight object projections by id list; optional update_types (omit or empty = nested defaults: listItem, sortCustom, pageContent, legalText, skillContent, name).',
    httpEquivalent: 'POST /query/v1/objects/resolve-nested',
    specPath: 'docs/apps/query-api/spec/objects-resolve-nested.md',
  },
  {
    name: 'check_object_exists',
    description: 'Boolean existence check for an object id.',
    httpEquivalent: 'GET /query/v1/objects/:id/exists',
  },
  {
    name: 'get_object_options',
    description:
      'Aggregated product variant options grouped by category (Color, Size, etc.) across meta_group_id siblings.',
    httpEquivalent: 'GET /query/v1/objects/:id/options',
    specPath: 'docs/apps/query-api/spec/object-options.md',
  },
  {
    name: 'get_object_related',
    description: 'Paginated related objects (IS_RELATED_TO).',
    httpEquivalent: 'GET /query/v1/objects/:id/related',
    specPath: 'docs/apps/query-api/spec/object-ref-list-endpoints.md',
  },
  {
    name: 'get_object_related_album_preview',
    description: 'Preview images for virtual Related gallery (post-derived).',
    httpEquivalent: 'GET /query/v1/objects/:id/gallery/related/preview',
    specPath: 'docs/apps/query-api/spec/object-related-album.md',
  },
  {
    name: 'get_object_related_album',
    description: 'Paginated virtual Related gallery images.',
    httpEquivalent: 'GET /query/v1/objects/:id/gallery/related',
    specPath: 'docs/apps/query-api/spec/object-related-album.md',
  },
  {
    name: 'get_object_similar',
    description: 'Paginated similar objects (IS_SIMILAR_TO).',
    httpEquivalent: 'GET /query/v1/objects/:id/similar',
    specPath: 'docs/apps/query-api/spec/object-ref-list-endpoints.md',
  },
  {
    name: 'get_object_add_on',
    description: 'Paginated add-on objects (ADD_ON).',
    httpEquivalent: 'GET /query/v1/objects/:id/add-on',
    specPath: 'docs/apps/query-api/spec/object-ref-list-endpoints.md',
  },
  {
    name: 'get_object_field_references',
    description:
      'Preview groups of objects referencing a person/business via schema fields (author, merchant, etc.).',
    httpEquivalent: 'GET /query/v1/objects/:id/field-references',
    specPath: 'docs/apps/query-api/spec/object-field-references.md',
  },
  {
    name: 'get_object_field_references_by_type',
    description: 'Paginated field-reference list for one target object type.',
    httpEquivalent: 'GET /query/v1/objects/:id/field-references/:referenceObjectType',
    specPath: 'docs/apps/query-api/spec/object-field-references.md',
  },
  {
    name: 'get_object_followers',
    description: 'Users following an object.',
    httpEquivalent: 'GET /query/v1/objects/:id/followers',
    specPath: 'docs/apps/query-api/spec/user-social-lists.md',
  },
  {
    name: 'get_object_experts',
    description: 'Users with per-object expertise on an object.',
    httpEquivalent: 'GET /query/v1/objects/:id/experts',
    specPath: 'docs/apps/query-api/spec/object-experts.md',
  },
  {
    name: 'get_object_favorited_by',
    description: 'Accounts that favorited an object.',
    httpEquivalent: 'GET /query/v1/objects/:id/favorited-by',
    specPath: 'docs/apps/query-api/spec/user-social-lists.md',
  },
  {
    name: 'get_object_ownership',
    description: 'Ownership holders for an object (exclusive or supervised).',
    httpEquivalent: 'GET /query/v1/objects/:id/ownership',
    specPath: 'docs/apps/query-api/spec/user-social-lists.md',
  },
  {
    name: 'get_object_updates',
    description: 'Paginated update feed for an object (history tab).',
    httpEquivalent: 'GET /query/v1/objects/:id/updates',
  },
  {
    name: 'get_object_posts',
    description:
      'Paginated posts feed for an object (Reviews tab; legacy getPostsByObject scope).',
    httpEquivalent: 'POST /query/v1/objects/:id/posts',
    specPath: 'docs/apps/query-api/spec/object-posts-feed.md',
  },
  {
    name: 'get_object_threads',
    description:
      'Paginated threads feed for an object (Reviews > Threads tab; legacy byHashtag scope).',
    httpEquivalent: 'POST /query/v1/objects/:id/threads',
    specPath: 'docs/apps/query-api/spec/object-threads-feed.md',
  },
  {
    name: 'get_update_voters',
    description: 'Approve/reject voter lists for a single object update.',
    httpEquivalent: 'GET /query/v1/objects/:id/updates/:updateId/voters',
    specPath: 'docs/apps/query-api/spec/update-voters-endpoint.md',
  },
  {
    name: 'get_user_profile',
    description: 'User profile shell data by Hive account name.',
    httpEquivalent: 'GET /query/v1/users/:name/profile',
    specPath: 'docs/apps/query-api/spec/users-profile-endpoint.md',
  },
  {
    name: 'get_user_notification_settings',
    description:
      'Notification preference toggles for the authenticated viewer (X-Viewer must match account).',
    httpEquivalent: 'GET /query/v1/users/:name/notification-settings',
    specPath: 'docs/apps/query-api/spec/user-notification-settings.md',
  },
  {
    name: 'get_user_account_sidebar',
    description:
      'Profile left-rail account panel: metadata, mana, RC, and vote value estimates.',
    httpEquivalent: 'GET /query/v1/users/:name/account-sidebar',
    specPath: 'docs/apps/query-api/spec/users-account-sidebar.md',
  },
  {
    name: 'get_user_blog',
    description: 'User blog feed posts with reward projection.',
    httpEquivalent: 'POST /query/v1/users/:name/blog',
    specPath: 'docs/apps/query-api/spec/user-blog-feed-endpoint.md',
  },
  {
    name: 'get_user_blog_object_filters',
    description:
      'Faceted object filters for a user blog feed (post counts per linked object).',
    httpEquivalent: 'GET /query/v1/users/:name/blog/object-filters',
    specPath: 'docs/apps/query-api/spec/user-blog-object-filters-endpoint.md',
  },
  {
    name: 'get_user_mentions',
    description: 'Posts mentioning the user.',
    httpEquivalent: 'POST /query/v1/users/:name/mentions',
    specPath: 'docs/apps/query-api/spec/user-mentions-feed-endpoint.md',
  },
  {
    name: 'get_user_threads',
    description: 'User threads feed (root posts in thread context).',
    httpEquivalent: 'POST /query/v1/users/:name/threads',
    specPath: 'docs/apps/query-api/spec/user-threads-feed-endpoint.md',
  },
  {
    name: 'get_user_comments',
    description:
      'Paginated comments authored by the user (feed tab). See user-comments-feed-endpoint.md.',
    httpEquivalent: 'POST /query/v1/users/:name/comments',
    specPath: 'docs/apps/query-api/spec/user-comments-feed-endpoint.md',
  },
  {
    name: 'get_user_activity',
    description:
      'Paginated Hive account history for the profile activity tab (raw operations).',
    httpEquivalent: 'POST /query/v1/users/:name/activity',
    specPath: 'docs/apps/query-api/spec/user-activity-endpoint.md',
  },
  {
    name: 'get_user_waiv_wallet',
    description: 'Live WAIV wallet summary (balances, display fields, USD estimate).',
    httpEquivalent: 'GET /query/v1/users/:name/wallet/waiv',
    specPath: 'docs/apps/query-api/spec/user-waiv-wallet-endpoint.md',
  },
  {
    name: 'get_user_waiv_wallet_history',
    description:
      'Paginated WAIV wallet transaction history (Hive Engine RPC + indexed swaps and airdrops).',
    httpEquivalent: 'POST /query/v1/users/:name/wallet/waiv/history',
    specPath: 'docs/apps/query-api/spec/user-waiv-wallet-endpoint.md',
  },
  {
    name: 'get_user_engine_wallet',
    description:
      'Live Hive Engine wallet summary with pinned SWAP.* tokens and USD estimates.',
    httpEquivalent: 'GET /query/v1/users/:name/wallet/engine',
    specPath: 'docs/apps/query-api/spec/user-engine-wallet-endpoint.md',
  },
  {
    name: 'get_user_engine_wallet_history',
    description:
      'Paginated Hive Engine wallet history (RPC excluding WAIV + indexed swaps).',
    httpEquivalent: 'POST /query/v1/users/:name/wallet/engine/history',
    specPath: 'docs/apps/query-api/spec/user-engine-wallet-endpoint.md',
  },
  {
    name: 'get_user_engine_swap_list',
    description: 'Swappable Hive Engine tokens and pool pairs for wallet swap UI.',
    httpEquivalent: 'GET /query/v1/users/:name/wallet/engine/swap/list',
    specPath: 'docs/apps/query-api/spec/user-engine-swap-endpoints.md',
  },
  {
    name: 'post_user_engine_swap_quote',
    description: 'AMM swap quote for Hive Engine market pools (no withdraw validation).',
    httpEquivalent: 'POST /query/v1/users/:name/wallet/engine/swap/quote',
    specPath: 'docs/apps/query-api/spec/user-engine-swap-endpoints.md',
  },
  {
    name: 'get_user_engine_deposit_address',
    description: 'Deposit routing instructions via Hive Engine converter API.',
    httpEquivalent: 'GET /query/v1/users/:name/wallet/engine/deposit/address',
    specPath: 'docs/apps/query-api/spec/user-engine-swap-endpoints.md',
  },
  {
    name: 'post_user_engine_withdraw_quote',
    description: 'Multi-hop swap + withdraw custom_json quote with final-leg validation.',
    httpEquivalent: 'POST /query/v1/users/:name/wallet/engine/withdraw/quote',
    specPath: 'docs/apps/query-api/spec/user-engine-swap-endpoints.md',
  },
  {
    name: 'get_user_engine_token_delegations',
    description: 'Incoming and outgoing Hive Engine token delegations for a user.',
    httpEquivalent: 'GET /query/v1/users/:name/wallet/engine/:symbol/delegations',
    specPath: 'docs/apps/query-api/spec/user-waiv-wallet-endpoint.md',
  },
  {
    name: 'get_user_hive_wallet',
    description:
      'Live Hive L1 wallet summary: liquid HIVE, Hive Power, RC, savings, HBD, delegation nets, USD estimate.',
    httpEquivalent: 'GET /query/v1/users/:name/wallet/hive',
    specPath: 'docs/apps/query-api/spec/user-hive-wallet-endpoint.md',
  },
  {
    name: 'get_user_hive_hp_delegations',
    description: 'Incoming, outgoing, and expiring HIVE Power delegations for a user.',
    httpEquivalent: 'GET /query/v1/users/:name/wallet/hive/delegations',
    specPath: 'docs/apps/query-api/spec/user-hive-wallet-endpoint.md',
  },
  {
    name: 'get_user_hive_rc_delegations',
    description: 'Incoming and outgoing Resource Credit delegations for a user.',
    httpEquivalent: 'GET /query/v1/users/:name/wallet/hive/rc-delegations',
    specPath: 'docs/apps/query-api/spec/user-hive-wallet-endpoint.md',
  },
  {
    name: 'get_user_hive_withdraw_range',
    description: 'Changelly min/max/rate for liquid HIVE withdraw to BTC, LTC, or ETH.',
    httpEquivalent:
      'GET /query/v1/users/:name/wallet/hive/withdraw/range?outputCoinType=btc|ltc|eth',
    specPath: 'docs/apps/query-api/spec/user-hive-changelly-withdraw.md',
  },
  {
    name: 'post_user_hive_withdraw_estimate',
    description: 'Changelly output estimate for a liquid HIVE withdraw amount.',
    httpEquivalent: 'POST /query/v1/users/:name/wallet/hive/withdraw/estimate',
    specPath: 'docs/apps/query-api/spec/user-hive-changelly-withdraw.md',
  },
  {
    name: 'post_hive_advanced_report',
    description:
      'Multi-account Hive L1 advanced wallet report with date range, mutual-transaction filter, and historical fiat.',
    httpEquivalent: 'POST /query/v1/wallet/hive/advanced-report',
    specPath: 'docs/apps/query-api/spec/user-hive-advanced-report-endpoint.md',
  },
  {
    name: 'post_hive_wallet_exemption',
    description: 'Toggle a viewer exemption for an advanced report row (excluded from totals).',
    httpEquivalent: 'POST /query/v1/wallet/hive/exemptions',
    specPath: 'docs/apps/query-api/spec/user-hive-advanced-report-endpoint.md',
  },
  {
    name: 'get_user_followers',
    description: 'Accounts following the user.',
    httpEquivalent: 'GET /query/v1/users/:name/followers',
    specPath: 'docs/apps/query-api/spec/user-social-lists.md',
  },
  {
    name: 'get_user_following',
    description: 'Accounts the user follows.',
    httpEquivalent: 'GET /query/v1/users/:name/following',
    specPath: 'docs/apps/query-api/spec/user-social-lists.md',
  },
  {
    name: 'get_user_following_objects',
    description: 'Objects the user follows.',
    httpEquivalent: 'GET /query/v1/users/:name/following-objects',
    specPath: 'docs/apps/query-api/spec/user-social-lists.md',
  },
  {
    name: 'get_user_authority_grantors',
    description:
      'Accounts that delegated Hive owner/active/posting authority to the user. Use for "who can I post as" checks (grantors of the wallet identity). HTTP 404 means the account is absent from accounts_current, not "no grantors".',
    httpEquivalent: 'GET /query/v1/users/:name/authority-grantors',
    specPath: 'docs/apps/query-api/spec/user-account-auths-endpoint.md',
  },
  {
    name: 'get_user_authority_grantees',
    description:
      'Accounts that received Hive owner/active/posting authority from the user (outgoing delegations).',
    httpEquivalent: 'GET /query/v1/users/:name/authority-grantees',
    specPath: 'docs/apps/query-api/spec/user-account-auths-endpoint.md',
  },
  {
    name: 'get_user_favorites_types',
    description: 'Object types present in user favorites (sidebar).',
    httpEquivalent: 'GET /query/v1/users/:name/favorites/types',
    specPath: 'docs/apps/query-api/spec/users-favorites-endpoint.md',
  },
  {
    name: 'get_user_favorites',
    description: 'Paginated favorite objects for a user profile.',
    httpEquivalent: 'GET /query/v1/users/:name/favorites',
    specPath: 'docs/apps/query-api/spec/users-favorites-endpoint.md',
  },
  {
    name: 'post_user_favorites_map',
    description: 'Geo-filtered favorites in a bounding box for profile map.',
    httpEquivalent: 'POST /query/v1/users/:name/favorites/map',
    specPath: 'docs/apps/query-api/spec/users-favorites-endpoint.md',
  },
  {
    name: 'get_user_expertise_counters',
    description: 'Hashtag and object expertise counts for a profile.',
    httpEquivalent: 'GET /query/v1/users/:name/expertise/counters',
    specPath: 'docs/apps/query-api/spec/user-expertise.md',
  },
  {
    name: 'get_user_expertise_objects',
    description: 'Paginated expertise objects for a profile (hashtags or objects scope).',
    httpEquivalent: 'GET /query/v1/users/:name/expertise/objects',
    specPath: 'docs/apps/query-api/spec/user-expertise.md',
  },
  {
    name: 'get_user_categories',
    description: 'Shop department tree for a user catalog.',
    httpEquivalent: 'GET /query/v1/users/:name/categories',
    specPath: 'docs/apps/query-api/spec/categories.md',
  },
  {
    name: 'get_category_objects',
    description:
      'Global paginated object feed for a department category name (weight sort, RefSummary cards).',
    httpEquivalent: 'GET /query/v1/categories/objects',
    specPath: 'docs/apps/query-api/spec/category-objects.md',
  },
  {
    name: 'get_user_shop_filters',
    description: 'Tag category and rating filter facets for a user shop/recipe catalog.',
    httpEquivalent: 'GET /query/v1/users/:name/shop/filters',
    specPath: 'docs/apps/query-api/spec/shop-feed-endpoints.md',
  },
  {
    name: 'get_user_shop_objects',
    description: 'Flat shop object list with categoryPath filter.',
    httpEquivalent: 'GET /query/v1/users/:name/shop-objects',
    specPath: 'docs/apps/query-api/spec/shop-feed-endpoints.md',
  },
  {
    name: 'get_user_shop_sections',
    description: 'Grouped shop sections (categories with object previews).',
    httpEquivalent: 'GET /query/v1/users/:name/shop-sections',
    specPath: 'docs/apps/query-api/spec/shop-feed-endpoints.md',
  },
  {
    name: 'get_home_feed',
    description:
      'Hub home post feed: global for guests; personalized for viewer (followed authors, followed objects, authority objects).',
    httpEquivalent: 'POST /query/v1/posts/feed',
    specPath: 'docs/apps/query-api/spec/home-feed.md',
  },
  {
    name: 'get_post',
    description:
      'Single post by author/permlink with rewards (currency affects reward label). See single-post-endpoint.md.',
    httpEquivalent: 'GET /query/v1/posts/:author/:permlink',
    specPath: 'docs/apps/query-api/spec/single-post-endpoint.md',
  },
  {
    name: 'get_post_discussion',
    description:
      'Comment tree for a root post via Hive bridge. Optional viewer for vote/reblog state.',
    httpEquivalent: 'GET /query/v1/posts/:author/:permlink/discussion',
    specPath: 'docs/apps/query-api/spec/post-discussion-endpoint.md',
  },
  {
    name: 'get_post_voters',
    description:
      'Paginated upvote/downvote list for a post or thread with per-voter USD value and profile.',
    httpEquivalent: 'GET /query/v1/posts/:author/:permlink/voters',
    specPath: 'docs/apps/query-api/spec/post-voters-endpoint.md',
  },
  {
    name: 'get_currency_market',
    description: 'Crypto market info (current + weekly).',
    httpEquivalent: 'GET /query/v1/currency/market',
  },
  {
    name: 'get_currency_fiat_rates',
    description: 'Latest fiat exchange rates for a base currency.',
    httpEquivalent: 'GET /query/v1/currency/rates/:base/latest',
  },
  {
    name: 'get_engine_rates',
    description: 'Hive Engine token rates (current + weekly window).',
    httpEquivalent: 'GET /query/v1/currency/engine/rates',
  },
  {
    name: 'get_engine_current',
    description: 'Current Hive Engine token aggregates.',
    httpEquivalent: 'GET /query/v1/currency/engine/current',
  },
  {
    name: 'get_engine_chart',
    description: 'Hive Engine price chart for a period.',
    httpEquivalent: 'GET /query/v1/currency/engine/chart',
  },
  {
    name: 'get_engine_pools_usd',
    description: 'USD scaling for Hive Engine swap pool symbols.',
    httpEquivalent: 'GET /query/v1/currency/engine/pools-usd',
  },
  {
    name: 'search_obl_offers',
    description: 'Search published OBL offers/requests by name, description, and tags.',
    httpEquivalent: 'GET /query/v1/obl/offers/search',
    specPath: 'docs/spec/open-business-layer.md',
  },
  {
    name: 'get_obl_offer',
    description: 'Get one published OBL offer by offer_id (optional version).',
    httpEquivalent: 'GET /query/v1/obl/offers/:offerId',
    specPath: 'docs/spec/open-business-layer.md',
  },
  {
    name: 'get_obl_ledger',
    description: 'Mutual Ledger drill-down for an account pair: contracts, invoices, payments, disputes, balance.',
    httpEquivalent: 'GET /query/v1/obl/ledger',
    specPath: 'docs/spec/obl/mutual-ledger.md',
  },
  {
    name: 'get_obl_balance',
    description: 'Per-pair USD balance in confirmed/pending/disputed states.',
    httpEquivalent: 'GET /query/v1/obl/balance',
    specPath: 'docs/spec/obl/mutual-ledger.md',
  },
  {
    name: 'convert_usd_to_waiv',
    description: 'Live USD→WAIV conversion using stored hive_engine_rates.',
    httpEquivalent: 'GET /query/v1/obl/convert/usd-to-waiv',
    specPath: 'docs/spec/obl/payments.md',
  },
  {
    name: 'get_obl_relationships',
    description: 'List OBL counterparties and per-pair balances for an account.',
    httpEquivalent: 'GET /query/v1/obl/relationships',
    specPath: 'docs/spec/open-business-layer.md',
  },
  {
    name: 'get_obl_arbitration',
    description: 'List open or resolved disputes assigned to an arbiter account.',
    httpEquivalent: 'GET /query/v1/obl/arbitration',
    specPath: 'docs/spec/obl/disputes.md',
  },
  {
    name: 'get_obl_contract',
    description: 'Get one OBL contract by contract_id.',
    httpEquivalent: 'GET /query/v1/obl/contracts/:contractId',
    specPath: 'docs/spec/open-business-layer.md',
  },
  {
    name: 'get_obl_service_order',
    description: 'Get one OBL service order by service_order_id with optional contract summary.',
    httpEquivalent: 'GET /query/v1/obl/service-orders/:serviceOrderId',
    specPath: 'docs/spec/obl/service-orders.md',
  },
  {
    name: 'get_obl_report',
    description: 'Get one OBL report by report_id with optional contract and service order.',
    httpEquivalent: 'GET /query/v1/obl/reports/:reportId',
    specPath: 'docs/spec/obl/reports.md',
  },
  {
    name: 'get_channels',
    description:
      'Viewer inbox: DM, group, and object channels the account belongs to. Requires viewer.',
    httpEquivalent: 'GET /query/v1/channels',
    specPath: 'docs/apps/query-api/spec/osl-messaging.md',
  },
  {
    name: 'get_channel_by_id',
    description: 'Channel detail for a member (or public object channel when allowed).',
    httpEquivalent: 'GET /query/v1/channels/:id',
    specPath: 'docs/apps/query-api/spec/osl-messaging.md',
  },
  {
    name: 'get_channel_by_alias',
    description: 'Resolve a channel by dm: or obj: alias.',
    httpEquivalent: 'GET /query/v1/channels/by-alias/:alias',
    specPath: 'docs/apps/query-api/spec/osl-messaging.md',
  },
  {
    name: 'get_channel_messages',
    description: 'Keyset-paginated message history for a channel the viewer can access.',
    httpEquivalent: 'POST /query/v1/channels/:id/messages',
    specPath: 'docs/apps/query-api/spec/osl-messaging.md',
  },
  {
    name: 'get_object_channel',
    description: 'Default object channel metadata for an object id.',
    httpEquivalent: 'GET /query/v1/objects/:object_id/channel',
    specPath: 'docs/apps/query-api/spec/osl-messaging.md',
  },
  {
    name: 'get_object_channel_messages',
    description:
      'Public object channel message feed with governance and viewer mute filters.',
    httpEquivalent: 'POST /query/v1/objects/:object_id/channel/messages',
    specPath: 'docs/apps/query-api/spec/osl-messaging.md',
  },
  {
    name: 'check_object_activity_duplicate',
    description:
      'Preflight duplicate check for archival object activity before broadcasting message_create.',
    httpEquivalent:
      'POST /query/v1/objects/:object_id/channel/messages/dedup-check',
    specPath: 'docs/apps/query-api/spec/osl-messaging.md',
  },
  {
    name: 'get_memo_public_key',
    description: 'Public memo key for a Hive account (encrypt/decrypt addressing).',
    httpEquivalent: 'GET /query/v1/users/:account/memo-public-key',
    specPath: 'docs/apps/query-api/spec/osl-messaging.md',
  },
] as const;

export const REGISTERED_MCP_TOOL_NAMES: readonly string[] = QUERY_MCP_TOOL_CATALOG.map(
  (t) => t.name,
);

export function catalogDescription(toolName: string): string {
  const entry = QUERY_MCP_TOOL_CATALOG.find((t) => t.name === toolName);
  if (!entry) {
    throw new Error(`Missing QUERY_MCP_TOOL_CATALOG entry for tool: ${toolName}`);
  }
  return entry.description;
}
