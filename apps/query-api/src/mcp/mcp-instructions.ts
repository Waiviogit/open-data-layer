/** MCP server instructions shown to agents on initialize. */
export const QUERY_API_MCP_INSTRUCTIONS = `Read-only **live data** mirror of query-api (POST /query/mcp). Returns current platform state — not documentation.

This is **not** knowledge-api:
- Do not use search here to learn how features work.
- For specs and field semantics use knowledge-api (search_knowledge / resolve_doc) under docs/apps/query-api/spec/.

First visit:
1. Read resource odl-query://routing or knowledge-api get_file docs/skills/query-api-mcp-routing.md
2. Read odl-query://catalog/tools for the full tool list
3. Pick a tool from the decision table below

Context params (replace HTTP headers):
- locale (default en-US) — content projection
- viewer — Hive account for personalized feeds/votes
- governance_object_id — governance mask override

Decision table:
| Intent | Tool |
|--------|------|
| Quick object/user lookup | search (+ search_counts for tab totals) |
| Browse catalog by type/tags | discover_objects, discover_tag_categories |
| Full object projection | resolve_object |
| Object rails (related/similar/add-on) | get_object_related / get_object_similar / get_object_add_on |
| User profile | get_user_profile |
| User notification settings | get_user_notification_settings (viewer must match account) |
| User feeds | get_user_blog, get_user_threads, get_user_comments, get_user_mentions, get_user_activity |
| User shop | get_user_categories, get_user_shop_filters, get_user_shop_objects, get_user_shop_sections |
| Single post + comments | get_post, get_post_discussion |
| Token/fiat rates | get_currency_* / get_engine_* |
| Who delegated authority to me / who can I post as | get_user_authority_grantors (404 = account absent from accounts_current, not "no grantors") |
| Who did this account delegate authority to | get_user_authority_grantees |
| Grant/revoke posting or act as grantor | Not here — docs/skills/hive-account-authority-for-agents.md + agent-wallet hive_build_posting_authority_grant |
| Hive Engine deposit (BTC → SWAP.BTC, …) | get_user_engine_deposit_list / get_user_engine_deposit_address, then agent-wallet osl_build_hive_engine_deposit + wallet_broadcast posting before showing the address — docs/skills/hive-engine-deposit-for-agents.md |

Excluded: user post drafts (JWT writes) — not exposed via MCP.

Top tools:
- resolve_object — object detail page data
- search — header predictive search
- get_user_profile — profile shell
- get_post — post article with rewards
- get_user_authority_grantors — posting/active/owner grantors for act-as checks
- discover_objects — discover page listing`;
