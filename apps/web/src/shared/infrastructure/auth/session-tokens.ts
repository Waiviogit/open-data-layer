/** Token pair returned by auth-api session issue/refresh. */
export type SessionTokenPair = {
  accessToken: string;
  refreshToken: string;
  user: { username: string };
};

export type AuthApiTokenResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: { username: string };
};

export function parseAuthApiTokenResponse(
  json: AuthApiTokenResponse,
): SessionTokenPair | null {
  const accessToken = json.accessToken?.trim();
  const refreshToken = json.refreshToken?.trim();
  const username = json.user?.username?.trim();
  if (!accessToken || !refreshToken || !username) {
    return null;
  }
  return {
    accessToken,
    refreshToken,
    user: { username },
  };
}
