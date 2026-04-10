import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { parseOptionalViewerQuery } from '../domain/feed/viewer-query';

/** Lowercase header name as seen on `IncomingMessage.headers`. */
export const VIEWER_HEADER = 'x-viewer';

function headerValue(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Optional Hive account viewing the post (`X-Viewer`); used for administrative heart on linked objects.
 */
export const ReqViewer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const raw = headerValue(request.headers?.[VIEWER_HEADER]);
    return parseOptionalViewerQuery(raw);
  },
);
