import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { McpToolDeps } from './mcp-tool.deps';

export const mcpLocaleContextFields = {
  locale: z
    .string()
    .default('en-US')
    .describe('Locale for content projection (e.g. en-US)'),
  viewer: z.string().optional().describe('Hive account name of the viewer'),
  governance_object_id: z
    .string()
    .optional()
    .describe('Governance object id override (X-Governance-Object-Id)'),
} as const;

export function withMcpLocaleContext<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
): z.ZodObject<
  T['shape'] & {
    locale: (typeof mcpLocaleContextFields)['locale'];
    viewer: (typeof mcpLocaleContextFields)['viewer'];
    governance_object_id: (typeof mcpLocaleContextFields)['governance_object_id'];
  }
> {
  return schema.extend(mcpLocaleContextFields);
}

export function jsonToolResult(data: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export function toolError(message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

export function resolveMcpCountry(deps: McpToolDeps, override?: string): string | null {
  return deps.countryResolver.resolve(deps.clientIp, override);
}

export function pickMcpContext(args: {
  locale?: string;
  viewer?: string;
  governance_object_id?: string;
}): {
  locale: string;
  viewerAccount?: string;
  governanceObjectIdFromHeader?: string;
} {
  return {
    locale: args.locale ?? 'en-US',
    viewerAccount: args.viewer?.trim() || undefined,
    governanceObjectIdFromHeader: args.governance_object_id?.trim() || undefined,
  };
}
