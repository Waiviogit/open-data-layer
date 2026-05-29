/** Set on the request by {@link JwtAccessGuard} after successful verification. */
export interface JwtAccessUser {
  sub: string;
}
