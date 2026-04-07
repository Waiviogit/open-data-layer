import type {
  ChallengeResponse,
  IAuthBffClient,
  SessionResponse,
} from '../../application/ports/auth-api.port';
import type { WalletProviderId } from '../../domain/types';

const BFF_BASE = '/api/auth';

function errorMessageFromBody(text: string, status: number): string {
  if (!text.trim()) {
    return `HTTP ${status}`;
  }
  try {
    const j = JSON.parse(text) as {
      message?: string | string[];
      error?: string;
    };
    if (typeof j.message === 'string') {
      return j.message;
    }
    if (Array.isArray(j.message)) {
      return j.message.join(', ');
    }
    if (typeof j.error === 'string') {
      return j.error;
    }
  } catch {
    // not JSON — use raw text
  }
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(errorMessageFromBody(text, res.status));
  }
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export function createAuthBffClient(): IAuthBffClient {
  return {
    async challenge(input: {
      provider: WalletProviderId;
      username: string;
    }): Promise<ChallengeResponse> {
      const res = await fetch(`${BFF_BASE}/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseJson<ChallengeResponse>(res);
    },

    async verifyKeychain(input: {
      challengeId: string;
      username: string;
      signature: string;
      signedMessage: string;
    }): Promise<SessionResponse> {
      const res = await fetch(`${BFF_BASE}/verify/keychain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseJson<SessionResponse>(res);
    },

    async verifyHiveAuth(input: {
      challengeId: string;
      username: string;
      authData: string;
    }): Promise<SessionResponse> {
      const res = await fetch(`${BFF_BASE}/verify/hiveauth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseJson<SessionResponse>(res);
    },

    async refresh(): Promise<SessionResponse> {
      const res = await fetch(`${BFF_BASE}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return parseJson<SessionResponse>(res);
    },

    async logout(): Promise<{ ok: true }> {
      const res = await fetch(`${BFF_BASE}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return parseJson<{ ok: true }>(res);
    },
  };
}
