'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { buildOdlObjectAuthorityOp } from '@opden-data-layer/hive-broadcast';

import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';

import type { AuthoritySubType } from '../../domain/object-page.types';

export type AuthorityActionButtonProps = {
  objectId: string;
  authorityType: AuthoritySubType;
  hasAuthority: boolean;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
};

export function AuthorityActionButton({
  objectId,
  authorityType,
  hasAuthority,
  viewerUsername,
  onRequireLogin,
}: AuthorityActionButtonProps) {
  useHydrateWalletProvider();
  const odlCustomJsonId = useOdlCustomJsonId();
  const router = useRouter();
  const { t } = useI18n();
  const [active, setActive] = useState(hasAuthority);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setActive(hasAuthority);
  }, [hasAuthority, objectId, authorityType]);

  const onClick = useCallback(async () => {
    const account = viewerUsername?.trim();
    if (!account) {
      onRequireLogin?.();
      return;
    }
    if (pending) {
      return;
    }
    const method = active ? 'remove' : 'add';
    const previous = active;
    setActive(!previous);
    setPending(true);
    try {
      const op = buildOdlObjectAuthorityOp({
        id: odlCustomJsonId,
        objectId,
        authorityType,
        method,
        required_posting_auths: [account],
      });
      const { transactionId } = await getWalletFacade().broadcast({
        operations: [op],
      });
      void awaitTrxConfirmation(transactionId).finally(() => {
        router.refresh();
        setPending(false);
      });
    } catch {
      setActive(previous);
      setPending(false);
    }
  }, [
    active,
    authorityType,
    objectId,
    odlCustomJsonId,
    onRequireLogin,
    pending,
    router,
    viewerUsername,
  ]);

  const label = active ? t('object_authority_action_remove') : t('object_authority_action_add');

  return (
    <div className="flex justify-end">
      <button
        type="button"
        disabled={pending}
        className={[
          'rounded-btn border px-4 py-2 text-body-sm font-medium transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          active
            ? 'border-border bg-surface-control text-muted hover:bg-surface-control-hover'
            : 'border-accent text-accent hover:bg-accent/10',
          pending ? 'cursor-not-allowed opacity-50' : '',
        ].join(' ')}
        onClick={() => void onClick()}
      >
        {label}
      </button>
    </div>
  );
}
