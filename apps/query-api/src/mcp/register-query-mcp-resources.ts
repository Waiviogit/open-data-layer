import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  QUERY_MCP_ROUTING_SKILL_PATH,
  QUERY_MCP_TOOL_CATALOG,
} from './mcp-tool-catalog';

function resolveRoutingSkillPath(): string {
  const fromEnv = process.env.QUERY_API_DOCS_ROOT?.trim();
  const root = fromEnv || path.resolve(process.cwd());
  return path.join(root, QUERY_MCP_ROUTING_SKILL_PATH);
}

async function readRoutingSkillBody(): Promise<string> {
  try {
    return await readFile(resolveRoutingSkillPath(), 'utf8');
  } catch {
    return [
      'Routing skill file not found on disk.',
      `Expected: ${QUERY_MCP_ROUTING_SKILL_PATH}`,
      'Install: npx skills add https://github.com/Waiviogit/skills',
      'Or knowledge-api: get_file({ path: "odl/query-api-mcp-routing/SKILL.md" })',
      'Or set QUERY_API_DOCS_ROOT to the repo root and run pnpm sync:odl-skills.',
    ].join('\n');
  }
}

export function registerQueryMcpResources(server: McpServer): void {
  server.registerResource(
    'routing-map',
    'odl-query://routing',
    {
      title: 'Query API MCP routing for agents',
      description: 'First-visit routing map: live data tools vs knowledge-api docs',
      mimeType: 'text/markdown',
    },
    async () => {
      const text = await readRoutingSkillBody();
      return {
        contents: [
          {
            uri: 'odl-query://routing',
            mimeType: 'text/markdown',
            text,
          },
        ],
      };
    },
  );

  server.registerResource(
    'tools-catalog',
    'odl-query://catalog/tools',
    {
      title: 'Query API MCP tools catalog',
      description: 'JSON list of MCP tools with HTTP equivalents and spec paths',
      mimeType: 'application/json',
    },
    async () => {
      const payload = {
        tools: QUERY_MCP_TOOL_CATALOG.map((t) => ({
          name: t.name,
          description: t.description,
          httpEquivalent: t.httpEquivalent ?? null,
          specPath: t.specPath ?? null,
        })),
      };
      return {
        contents: [
          {
            uri: 'odl-query://catalog/tools',
            mimeType: 'application/json',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'first_visit',
    {
      title: 'Query API MCP first visit',
      description: 'Steps for agents on first connection to query-api live data MCP',
      argsSchema: {
        task: z
          .string()
          .optional()
          .describe('Optional user task to pick the first tool'),
      },
    },
    async ({ task }) => {
      const steps = [
        '1. Read server instructions from initialize.',
        '2. Read resource odl-query://routing (or knowledge-api get_file odl/query-api-mcp-routing/SKILL.md).',
        '3. Read odl-query://catalog/tools — full tool list with HTTP mapping.',
        task
          ? `4. For "${task}": use the decision table in routing skill to pick a tool, then call it with locale/viewer as needed.`
          : '4. Pick a tool from the decision table (search vs discover vs resolve_object vs feeds).',
        '5. For field semantics and API contracts use knowledge-api docs/apps/query-api/spec/ — not MCP search here.',
        '6. Drafts are not available via MCP.',
      ];
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: steps.join('\n'),
            },
          },
        ],
      };
    },
  );
}
