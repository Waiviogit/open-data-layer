import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { z } from 'zod';
import { activityAuthorsFilterFields } from '../../domain/governance/activity-authors-filter.schema';
import type { McpToolDeps } from '../mcp-tool.deps';
import { registerChannelTools } from './channels.tools';
import { registerObjectTools } from './objects.tools';
import { registerUserTools } from './users.tools';

type Captured = {
  name: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
};

function capture(
  register: (server: McpServer, deps: McpToolDeps) => void,
  deps: Partial<McpToolDeps>,
): Captured[] {
  const tools: Captured[] = [];
  register(
    {
      registerTool: (
        name: string,
        meta: { inputSchema?: z.ZodObject<z.ZodRawShape> },
        handler: (args: Record<string, unknown>) => Promise<unknown>,
      ) => {
        if (meta.inputSchema) {
          tools.push({ name, inputSchema: meta.inputSchema, handler });
        }
      },
    } as unknown as McpServer,
    deps as McpToolDeps,
  );
  return tools;
}

function fieldDescription(field: unknown): string | undefined {
  return (field as { description?: string }).description;
}

function expectAuthorsFields(schema: z.ZodObject<z.ZodRawShape>): void {
  expect(fieldDescription(schema.shape.authors_only)).toBe(
    fieldDescription(activityAuthorsFilterFields.authors_only),
  );
  expect(fieldDescription(schema.shape.authors_governance_object_id)).toBe(
    fieldDescription(activityAuthorsFilterFields.authors_governance_object_id),
  );
}

describe('MCP activity authors params', () => {
  it('exposes authors filter fields on the three activity tools', () => {
    const channel = capture(registerChannelTools, {}).find(
      (tool) => tool.name === 'get_object_channel_messages',
    );
    const users = capture(registerUserTools, {}).find(
      (tool) => tool.name === 'get_followed_objects_messages',
    );
    const objects = capture(registerObjectTools, {}).find(
      (tool) => tool.name === 'get_object_threads',
    );

    expect(channel).toBeDefined();
    expect(users).toBeDefined();
    expect(objects).toBeDefined();
    expectAuthorsFields(channel!.inputSchema);
    expectAuthorsFields(users!.inputSchema);
    expectAuthorsFields(objects!.inputSchema);
  });

  it('forwards authors_only and governance context from get_object_threads', async () => {
    const execute = jest.fn().mockResolvedValue({ items: [], cursor: null, hasMore: false });
    const objects = capture(registerObjectTools, {
      getObjectThreadsFeed: { execute },
    } as unknown as Partial<McpToolDeps>).find((tool) => tool.name === 'get_object_threads');

    await objects!.handler({
      object_id: 'obj-1',
      authors_only: true,
      governance_object_id: 'gov-h',
    });

    expect(execute).toHaveBeenCalledWith(
      'obj-1',
      expect.objectContaining({ authors_only: true }),
      undefined,
      'gov-h',
    );
  });
});
