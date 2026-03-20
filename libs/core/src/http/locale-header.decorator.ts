import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { localeFromHeaders } from './locale-from-headers';

function headerValue(
  raw: string | string[] | undefined,
): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * HTTP request parameter: resolved BCP-47 locale from `X-Locale` (override) and
 * `Accept-Language` (first tag), via {@link localeFromHeaders}.
 */
export const ReqLocale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const headers = request.headers ?? {};
    return localeFromHeaders(
      headerValue(headers['accept-language']),
      headerValue(headers['x-locale']),
    );
  },
);
