'use client';

import { useState } from 'react';

import {
  getWalletFacade,
  ODL_WALLET_PROVIDER_SESSION_KEY,
} from '../../infrastructure/wallet-facade.client';

export type KeychainLoginProps = {
  onLoginSuccess?: () => void;
};

export function KeychainLogin({ onLoginSuccess }: KeychainLoginProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await getWalletFacade().login('keychain', username.trim());
      try {
        sessionStorage.setItem(ODL_WALLET_PROVIDER_SESSION_KEY, 'keychain');
      } catch {
        // ignore quota / private mode
      }
      onLoginSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-caption font-label text-fg-secondary">Hive username</span>
        <input
          className="rounded-btn border border-border bg-surface-control px-3 py-2 text-body text-fg outline-none focus-visible:ring-2 focus-visible:ring-outline-focus"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="alice"
          autoComplete="username"
          disabled={pending}
        />
      </label>
      {error ? (
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !username.trim()}
        className="rounded-btn bg-accent px-4 py-2 font-label text-accent-fg hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? 'Signing…' : 'Sign in with Keychain'}
      </button>
    </form>
  );
}
