'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { WALLET_PROVIDERS } from '../../domain/wallet-providers';
import type { WalletProviderId } from '../../domain/types';
import { HiveAuthLogin } from './hiveauth-login';
import { HivesignerLogin } from './hivesigner-login';
import { KeychainLogin } from './keychain-login';
import { ProviderList } from './provider-list';

export type LoginDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginDialog({ open, onClose }: LoginDialogProps) {
  const router = useRouter();
  const [provider, setProvider] = useState<WalletProviderId | null>('keychain');

  function handleLoginSuccess() {
    onClose();
    router.refresh();
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-dialog-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card-lg border border-border bg-surface p-card-padding shadow-card-float">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id="login-dialog-title"
            className="text-section font-display text-heading"
          >
            Sign in
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn px-2 py-1 text-body-sm text-fg-secondary hover:bg-ghost-surface hover:text-fg"
          >
            Close
          </button>
        </div>

        <ProviderList
          providers={WALLET_PROVIDERS}
          selectedId={provider}
          onSelect={setProvider}
        />

        <div className="mt-6 border-t border-border pt-6">
          {provider === 'keychain' ? (
            <KeychainLogin onLoginSuccess={handleLoginSuccess} />
          ) : null}
          {provider === 'hiveauth' ? (
            <HiveAuthLogin onLoginSuccess={handleLoginSuccess} />
          ) : null}
          {provider === 'hivesigner' ? <HivesignerLogin /> : null}
        </div>
      </div>
    </div>
  );
}
