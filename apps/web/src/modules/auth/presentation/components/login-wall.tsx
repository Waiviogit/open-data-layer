'use client';

import { useRouter } from 'next/navigation';

import { WALLET_PROVIDERS } from '../../domain/wallet-providers';
import { ProviderList } from './provider-list';

const INLINE_PROVIDERS = WALLET_PROVIDERS.filter((p) => p.id !== 'hiveauth');

export function LoginWall() {
  const router = useRouter();

  function handleLoginSuccess() {
    router.push('/');
    router.refresh();
  }

  return (
    <ProviderList
      providers={INLINE_PROVIDERS}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
