import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { categoryObjectsQuerySchema } from '../../domain/categories/category-objects-query.schema';
import { catalogDescription } from '../mcp-tool-catalog';
import type { McpToolDeps } from '../mcp-tool.deps';
import { jsonToolResult, pickMcpContext, resolveMcpCountry, withMcpLocaleContext } from '../mcp-tool.helpers';

export function registerCategoryTools(server: McpServer, deps: McpToolDeps): void {
  server.registerTool(
    'get_category_objects',
    {
      description: catalogDescription('get_category_objects'),
      inputSchema: withMcpLocaleContext(categoryObjectsQuerySchema),
    },
    async (args) => {
      const ctx = pickMcpContext(args);
      const result = await deps.getCategoryObjects.execute({
        query: {
          name: args.name,
          limit: args.limit,
          cursor: args.cursor,
          exclude_object_id: args.exclude_object_id,
        },
        locale: ctx.locale,
        viewerAccount: ctx.viewerAccount,
        governanceObjectIdFromHeader: ctx.governanceObjectIdFromHeader,
        countryCode: resolveMcpCountry(deps, args.country),
      });
      return jsonToolResult(result);
    },
  );
}
