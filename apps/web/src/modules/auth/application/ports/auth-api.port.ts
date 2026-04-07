import type { WalletProviderId } from '../../domain/types';

export interface ChallengeResponse {
  challengeId: string;
  message: string;
  expiresAt: string;
  authorizeUrl?: string;
  state?: string;
}

export interface SessionResponse {
  user: { username: string };
}

export interface IAuthBffClient {
  challenge(input: {
    provider: WalletProviderId;
    username: string;
  }): Promise<ChallengeResponse>;

  verifyKeychain(input: {
    challengeId: string;
    username: string;
    signature: string;
    signedMessage: string;
  }): Promise<SessionResponse>;

  verifyHiveAuth(input: {
    challengeId: string;
    username: string;
    authData: string;
  }): Promise<SessionResponse>;

  refresh(): Promise<SessionResponse>;

  logout(): Promise<{ ok: true }>;
}
