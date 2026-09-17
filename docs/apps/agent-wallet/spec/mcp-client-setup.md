---
title: MCP client setup
description: Register agent-wallet as an HTTP MCP server in Cursor, Claude, Codex, or Hermes.
type: spec
status: active
scope: agent-wallet
tags: [agent-wallet, mcp, setup]
updated_at: 2026-09-08
related:
  - docs/skills/hive-has-agent-wallet.md
  - docs/apps/agent-wallet/spec/overview.md
---

# MCP client setup

Register **agent-wallet** as an HTTP MCP server so your agent gets native tools (`wallet_broadcast`, `hive_build_post`, `odl_build_object_create`, …) instead of shelling out to curl or Python.

## Prerequisites

1. Daemon running on `http://127.0.0.1:7500` — see [hive-has-agent-wallet skill](../../../skills/hive-has-agent-wallet.md).
2. Bearer token from `~/.odl/agent-wallet.token` (auto-generated on first start).

**Token in config:** MCP client headers cannot read files. Paste the token value inline, or pin it with `AGENT_WALLET_BEARER_TOKEN` in the daemon env so the token survives restarts.

**Required headers:** every MCP request needs `Authorization: Bearer <token>` and `Accept: application/json, text/event-stream`. Omitting `text/event-stream` yields **406**.

## Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "agent-wallet": {
      "url": "http://127.0.0.1:7500/agent-wallet/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE",
        "Accept": "application/json, text/event-stream"
      }
    }
  }
}
```

## Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "agent-wallet": {
      "type": "http",
      "url": "http://127.0.0.1:7500/agent-wallet/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE",
        "Accept": "application/json, text/event-stream"
      }
    }
  }
}
```

## Codex (`config.toml`)

```toml
[mcp_servers.agent-wallet]
url = "http://127.0.0.1:7500/agent-wallet/mcp"

[mcp_servers.agent-wallet.headers]
Authorization = "Bearer YOUR_TOKEN_HERE"
Accept = "application/json, text/event-stream"
```

## Hermes (`mcp_servers` YAML)

Full tool surface (no filter):

```yaml
mcp_servers:
  odl_agent_wallet:
    url: "http://127.0.0.1:7500/agent-wallet/mcp"
    headers:
      Authorization: "Bearer YOUR_TOKEN_HERE"
      Accept: "application/json, text/event-stream"
```

Messaging-only subset (cron polling):

```yaml
mcp_servers:
  odl_agent_wallet:
    url: "http://127.0.0.1:7500/agent-wallet/mcp"
    headers:
      Authorization: "Bearer YOUR_TOKEN_HERE"
      Accept: "application/json, text/event-stream"
    tools:
      include:
        - wallet_status
        - wallet_accounts
        - notifications_pull
        - notifications_status
        - osl_activity_fingerprint
        - osl_build_message_create
        - osl_build_message_update
        - osl_build_message_delete
        - osl_build_encrypted_message_create
        - osl_memo_decrypt
        - wallet_broadcast
        - wallet_broadcast_status
```

## Verify registration

1. Restart the MCP client after editing config.
2. Confirm tools appear: `wallet_status`, `wallet_broadcast`, `hive_build_post`, `odl_build_object_create`, …
3. Optional health check: `GET http://127.0.0.1:7500/agent-wallet/health` → `{ "status": "ok" }`.

## Fallback: raw JSON-RPC

If your agent cannot add MCP servers, use `curl` or `Invoke-RestMethod` — never a Python/Node scratch script. See [hive-has-agent-wallet § Fallback](../../../skills/hive-has-agent-wallet.md#fallback-raw-json-rpc).

## Related

- [agent-wallet overview](overview.md)
- [hive-has-agent-wallet skill](../../../skills/hive-has-agent-wallet.md)
