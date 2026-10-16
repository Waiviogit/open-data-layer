import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { resolveClientIp } from './client-ip';

/**
 * Client IP after Express `trust proxy` (`req.ip`), then `normalizeClientIp`.
 * Do not parse `X-Forwarded-For` in controllers.
 */
export const ReqClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return resolveClientIp(request);
  },
);
