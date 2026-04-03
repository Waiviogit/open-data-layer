import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/** Lowercase header name as seen on `IncomingMessage.headers`. */
export const GOVERNANCE_OBJECT_ID_HEADER = 'x-governance-object-id';

function headerValue(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Optional governance object ID from `X-Governance-Object-Id` for per-request governance merge.
 */
export const ReqGovernanceObjectId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const raw = headerValue(request.headers?.[GOVERNANCE_OBJECT_ID_HEADER]);
    const trimmed = raw?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : undefined;
  },
);
