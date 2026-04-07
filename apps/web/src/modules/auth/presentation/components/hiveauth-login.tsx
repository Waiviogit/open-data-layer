'use client';

import { useState } from 'react';

import { createHiveAuthVerifyUseCase } from '../../application';
import { createAuthBffClient } from '../../infrastructure/clients/auth-bff.client';
import { buildHiveAuthPayload } from '../../infrastructure/providers/hiveauth-provider';

const bff = createAuthBffClient();
const verifyHiveAuth = createHiveAuthVerifyUseCase(bff);

export type HiveAuthLoginProps = {
  onLoginSuccess?: () => void;
};

export function HiveAuthLogin({ onLoginSuccess }: HiveAuthLoginProps) {
  const [username, setUsername] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [message, setMessage] = useState('');
  const [authData, setAuthData] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function startChallenge(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const ch = await bff.challenge({
        provider: 'hiveauth',
        username: username.trim(),
      });
      setChallengeId(ch.challengeId);
      setMessage(ch.message);
      setAuthData(
        buildHiveAuthPayload({
          username: username.trim().replace(/^@/, ''),
          expireUnix: Math.floor(Date.now() / 1000) + 3600,
          challengeMessage: ch.message,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Challenge failed');
    } finally {
      setPending(false);
    }
  }

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await verifyHiveAuth({
        challengeId,
        username: username.trim(),
        authData: authData.trim(),
      });
      onLoginSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verify failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={startChallenge} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-caption font-label text-fg-secondary">Hive username</span>
          <input
            className="rounded-btn border border-border bg-surface-control px-3 py-2 text-body text-fg outline-none focus-visible:ring-2 focus-visible:ring-outline-focus"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="alice"
            disabled={pending}
          />
        </label>
        <button
          type="submit"
          disabled={pending || !username.trim()}
          className="rounded-btn bg-secondary px-4 py-2 font-label text-secondary-fg hover:opacity-90 disabled:opacity-50"
        >
          {pending ? '…' : 'Start challenge'}
        </button>
      </form>

      {challengeId ? (
        <form onSubmit={submitAuth} className="flex flex-col gap-3">
          <p className="text-body-sm text-fg-secondary">
            Complete authentication in your HiveAuth wallet, then paste the JSON payload
            (or adjust) below. Challenge message:
          </p>
          <pre className="max-h-32 overflow-auto rounded-card border border-border bg-code-bg p-3 text-body-xs text-fg">
            {message}
          </pre>
          <label className="flex flex-col gap-1">
            <span className="text-caption font-label text-fg-secondary">authData (JSON)</span>
            <textarea
              className="min-h-[120px] rounded-btn border border-border bg-surface-control px-3 py-2 font-mono text-body-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-outline-focus"
              value={authData}
              onChange={(e) => setAuthData(e.target.value)}
              disabled={pending}
            />
          </label>
          <button
            type="submit"
            disabled={pending || !authData.trim()}
            className="rounded-btn bg-accent px-4 py-2 font-label text-accent-fg hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? 'Verifying…' : 'Verify HiveAuth'}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
