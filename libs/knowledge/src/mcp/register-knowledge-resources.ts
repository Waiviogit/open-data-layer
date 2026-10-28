import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { resolveLegacySkillPath } from '../routing/legacy-skill-path';
import type { KnowledgeMcpDeps } from './mcp-tool.deps';

const ROUTING_PATH = 'odl/knowledge-api-routing/SKILL.md';

export function registerKnowledgeResources(server: McpServer, deps: KnowledgeMcpDeps): void {
  server.registerResource(
    'routing-map',
    'odl-knowledge://routing',
    {
      title: 'Knowledge API routing for agents',
      description: 'First-visit MCP routing map with decision table and tool cheat sheet',
      mimeType: 'text/markdown',
    },
    async () => {
      const file = await deps.repo.findFileByPath(ROUTING_PATH);
      if (!file) {
        return {
          contents: [
            {
              uri: 'odl-knowledge://routing',
              mimeType: 'text/plain',
              text: `Routing skill not indexed. Run knowledge reindex. Expected path: ${ROUTING_PATH}`,
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: 'odl-knowledge://routing',
            mimeType: 'text/markdown',
            text: file.body,
          },
        ],
      };
    },
  );

  server.registerResource(
    'skills-catalog',
    'odl-knowledge://catalog/skills',
    {
      title: 'Indexed skills catalog',
      description: 'JSON list of skill playbooks with description one-liners',
      mimeType: 'application/json',
    },
    async () => {
      const { files } = await deps.repo.listFiles({ type: 'skill', status: 'active' });
      const payload = files.map((f) => ({
        path: f.path,
        title: f.title,
        description: f.description,
        tags: f.tags,
      }));
      return {
        contents: [
          {
            uri: 'odl-knowledge://catalog/skills',
            mimeType: 'application/json',
            text: JSON.stringify({ skills: payload }, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    'doc-by-path',
    new ResourceTemplate('odl-knowledge://doc/{+path}', { list: undefined }),
    {
      title: 'Knowledge doc by repo path',
      description: 'Read indexed markdown by repo-relative path',
      mimeType: 'text/markdown',
    },
    async (uri, variables) => {
      const rawPath = variables.path;
      const docPath = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
      const resolved = resolveLegacySkillPath(docPath);
      const file = await deps.repo.findFileByPath(resolved.path);
      if (!file) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/plain',
              text: `File not found: ${docPath}`,
            },
          ],
        };
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: file.body,
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'first_visit',
    {
      title: 'Knowledge API first visit',
      description: 'Steps for agents on first MCP connection to ODL knowledge base',
      argsSchema: {
        task: z.string().optional().describe('Optional user task to seed resolve_doc'),
      },
    },
    async ({ task }) => {
      const steps = [
        '1. Read server instructions from initialize.',
        '2. Read resource odl-knowledge://routing (or get_file odl/knowledge-api-routing/SKILL.md).',
        '3. list_files({ type: "skill" }) — catalog playbooks with description one-liners.',
        task
          ? `4. resolve_doc({ topic: "${task}" }) then get_file on top path.`
          : '4. resolve_doc({ topic: "<user task>" }) then get_file on top path.',
        '5. App features: list_files({ scope: "<app>" }) or docs/apps/<app>/spec/overview.md.',
        '6. Chain payloads: get_object_type / get_update_schema (not search).',
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
