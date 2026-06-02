'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { buildOdlObjectAuthorityOp } from '@opden-data-layer/hive-broadcast';

import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';

function IconHeartAdministrative({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      className={active ? 'text-accent' : 'text-fg-tertiary'}
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export type AdministrativeHeartButtonProps = {
  objectId: string;
  initialActive: boolean;
  viewerUsername?: string | null;
  onRequireLogin?: () => void;
};

export function AdministrativeHeartButton({
  objectId,
  initialActive,
  viewerUsername,
  onRequireLogin,
}: AdministrativeHeartButtonProps) {
  useHydrateWalletProvider();
  const odlCustomJsonId = useOdlCustomJsonId();
  const router = useRouter();
  const { t } = useI18n();
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setActive(initialActive);
  }, [initialActive, objectId]);

  const onToggle = useCallback(async () => {
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
        authorityType: 'administrative',
        method,
        required_posting_auths: [account],
      });
      const { transactionId } = await getWalletFacade().broadcast({
        operations: [op],
      });
      void awaitTrxConfirmation(transactionId).finally(() => {
        void refreshAfterBroadcast(router, () =>
          revalidateObjectAfterBroadcast(objectId),
        ).finally(() => {
          setPending(false);
        });
      });
    } catch {
      setActive(previous);
      setPending(false);
    }
  }, [active, objectId, odlCustomJsonId, onRequireLogin, pending, router, viewerUsername]);

  const hint = active ? t('feed_linked_object_admin_hint') : t('object_detail_favorites_add');
  const canInteract = viewerUsername != null && viewerUsername.trim().length > 0;

  if (!canInteract) {
    return (
      <span
        className="inline-flex"
        title={initialActive ? t('feed_linked_object_admin_hint') : undefined}
        aria-label={initialActive ? t('feed_linked_object_admin_hint') : undefined}
      >
        <IconHeartAdministrative active={initialActive} />
      </span>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex rounded-btn p-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      aria-pressed={active}
      title={hint}
      aria-label={hint}
      onClick={() => void onToggle()}
    >
      <IconHeartAdministrative active={active} />
    </button>
  );
}
