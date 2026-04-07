'use client';

/**
 * HiveAuth login completes by sending `authData` JSON to the auth BFF verify endpoint.
 * Integrate the HAS client (WebSocket + PKSA) in your app; then call this with the
 * decrypted payload fields (`username`, `expire`, optional `challenge`).
 */
export function buildHiveAuthPayload(input: {
  username: string;
  expireUnix: number;
  challengeMessage?: string;
}): string {
  return JSON.stringify({
    username: input.username,
    expire: input.expireUnix,
    ...(input.challengeMessage !== undefined
      ? { challenge: input.challengeMessage }
      : {}),
  });
}
