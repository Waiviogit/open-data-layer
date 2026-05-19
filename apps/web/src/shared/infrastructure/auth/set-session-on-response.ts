import type { NextResponse } from 'next/server';

import {
  parseAuthApiTokenResponse,
  type AuthApiTokenResponse,
} from './session-tokens';
import { applySessionTokensToResponse } from './refresh-session';

export function setSessionCookiesFromAuthApiResponse(
  response: NextResponse,
  json: AuthApiTokenResponse,
): boolean {
  const tokens = parseAuthApiTokenResponse(json);
  if (!tokens) {
    return false;
  }
  applySessionTokensToResponse(response, tokens);
  return true;
}
