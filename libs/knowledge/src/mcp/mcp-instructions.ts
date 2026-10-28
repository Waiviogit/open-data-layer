/** MCP server instructions shown to agents on initialize. */
export const KNOWLEDGE_MCP_INSTRUCTIONS = `Project knowledge base (ODL docs, skills, lessons, registries).

Install ODL skills locally (preferred): npx skills add https://github.com/Waiviogit/skills
This MCP is the fallback when local skills are not installed.

First visit workflow:
1. Read resource odl-knowledge://routing (or get_file odl/knowledge-api-routing/SKILL.md)
2. list_files({ type: "skill" }) — procedural skills with description one-liners (excludes object-create playbooks; use type: "playbook" or get_object_create_playbook)
3. resolve_doc({ topic: "<user task>" }) → get_file(path) for full markdown
4. get_context({ topic }) — compact chunks when route is unclear

Doc taxonomy:
- skill — procedural playbooks (odl/<name>/SKILL.md)
- playbook — per-object-type create reference (odl/object-create/references/); reach via get_object_create_playbook or list_files({ type: "playbook" }), not list_files({ type: "skill" })
- reference — extra notes next to a skill (not listed as skills)
- spec / overview — app and domain behavior
- agents — coding rules (AGENTS.md)
- registry — object/update type reference (also use get_object_type / get_update_schema)

App features: resolve_doc or list_files({ scope: "<app>" }) before search_knowledge.

Key paths:
- odl/knowledge-api-routing/SKILL.md — MCP routing map (read first if lost)
- odl/setup-workspace/SKILL.md — sidecar agent / clone repo
- docs/getting-started.md — local dev (Docker, migrate, pnpm nx serve)
- odl/hive-account-signup/SKILL.md — new Hive account
- odl/hive-blockchain-broadcast/SKILL.md — sign and broadcast chain ops
- odl/query-api-mcp-routing/SKILL.md — live-data query-api MCP tools (incl. OBL reads)
- odl/obl-offers-contracts/SKILL.md — OBL discover/publish/sign contracts
- odl/obl-ledger/SKILL.md — OBL invoices, payments, balances
- odl/obl-disputes/SKILL.md — OBL disputes and arbitration
- odl/build-tenant-site/SKILL.md — create web project; fork apps/web (Next.js); never standalone .html; object-menu or custom UI + query-api
- docs/apps/<app>/spec/ — feature specs

Chain payloads: use get_object_create_playbook (before create), get_object_type, and get_update_schema — not search_knowledge.

Not indexed: .agents/skills/ (Cursor runtime only).`;
