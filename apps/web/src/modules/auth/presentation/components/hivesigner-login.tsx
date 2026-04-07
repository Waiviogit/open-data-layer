'use client';

import { useState } from 'react';

import { createAuthBffClient, redirectToHiveSigner } from '../../infrastructure';

const bff = createAuthBffClient();

export function HivesignerLogin() {
  const [username, setUsername] = useState('');
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const ch = await bff.challenge({
        provider: 'hivesigner',
        username: username.trim(),
      });
      if (!ch.authorizeUrl) {
        throw new Error('authorizeUrl not returned — check HiveSigner env on auth-api');
      }
      setAuthorizeUrl(ch.authorizeUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Challenge failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
          className="rounded-btn bg-accent px-4 py-2 font-label text-accent-fg hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? '…' : 'Get HiveSigner link'}
        </button>
      </form>
      {authorizeUrl ? (
        <button
          type="button"
          onClick={() => redirectToHiveSigner(authorizeUrl)}
          className="rounded-btn border border-border-strong bg-surface-alt px-4 py-2 font-label text-fg hover:bg-ghost-surface"
        >
          Open HiveSigner
        </button>
      ) : null}
      {error ? (
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
