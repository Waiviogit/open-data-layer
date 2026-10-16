import type { Request } from 'express';
import { resolveClientIp } from '../http/client-ip';
import type { McpRequestContext } from './mcp-tool.deps';

export function mcpRequestContextFromRequest(
  req: Request,
): McpRequestContext {
  return { clientIp: resolveClientIp(req) };
}
