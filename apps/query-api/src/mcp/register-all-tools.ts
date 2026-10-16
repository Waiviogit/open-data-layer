import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpRequestContext, McpToolDeps } from './mcp-tool.deps';
import { registerChannelTools } from './tools/channels.tools';
import { registerCategoryTools } from './tools/categories.tools';
import { registerCurrencyTools } from './tools/currency.tools';
import { registerDiscoverTools } from './tools/discover.tools';
import { registerObjectTools } from './tools/objects.tools';
import { registerPostTools } from './tools/posts.tools';
import { registerSearchTools } from './tools/search.tools';
import { registerUserTools } from './tools/users.tools';
import { registerOblTools } from './tools/obl.tools';

export function registerAllMcpTools(
  server: McpServer,
  deps: McpToolDeps,
  ctx: McpRequestContext = { clientIp: null },
): void {
  // Reserved for geo/IP tools. clientIp is request-derived, never a tool arg.
  void ctx;
  registerSearchTools(server, deps);
  registerDiscoverTools(server, deps);
  registerObjectTools(server, deps);
  registerUserTools(server, deps);
  registerChannelTools(server, deps);
  registerCategoryTools(server, deps);
  registerPostTools(server, deps);
  registerCurrencyTools(server, deps);
  registerOblTools(server, deps);
}
