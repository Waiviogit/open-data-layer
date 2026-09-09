'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { buildOdlUpdateCreateOp, buildOdlUpdateVoteOp } from '@opden-data-layer/hive-broadcast';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { getWalletFacade } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';
import { broadcastOdlOpWithOverflow } from '@/modules/object-updates/application/broadcast-odl-op-with-overflow';
import { broadcastOverflowErrorMessage } from '@/modules/object-updates/application/broadcast-overflow-error-message';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';

export type UseListCatalogEditOptions = {
  catalogObjectId: string;
  viewerUsername: string | null | undefined;
  onRequireLogin?: () => void;
};

export function useListCatalogEdit({
  catalogObjectId,
  viewerUsername,
  onRequireLogin,
}: UseListCatalogEditOptions) {
  const router = useRouter();
  const { t } = useI18n();
  const odlCustomJsonId = useOdlCustomJsonId();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const addListItem = useCallback(
    async (targetObjectId: string) => {
      const creator = viewerUsername?.trim();
      if (!creator) {
        onRequireLogin?.();
        return;
      }
      const objectId = targetObjectId.trim();
      if (!objectId) {
        return;
      }
      setBusy(true);
      setActionError(null);
      try {
        const op = buildOdlUpdateCreateOp({
          id: odlCustomJsonId,
          objectId: catalogObjectId,
          updateType: UPDATE_TYPES.LIST_ITEM,
          creator,
          valueKind: 'object_ref',
          value: objectId,
          required_posting_auths: [creator],
        });
        const result = await broadcastOdlOpWithOverflow({
          op,
          account: creator,
          odlCustomJsonId,
          objectId: catalogObjectId,
        });
        if (result.success) {
          void refreshAfterBroadcast(router, () =>
            revalidateObjectAfterBroadcast(catalogObjectId),
          );
          return;
        }
        setActionError(broadcastOverflowErrorMessage(result.error, t));
      } finally {
        setBusy(false);
      }
    },
    [catalogObjectId, odlCustomJsonId, onRequireLogin, router, t, viewerUsername],
  );

  const rejectListItem = useCallback(
    async (listItemUpdateId: string) => {
      const voter = viewerUsername?.trim();
      if (!voter) {
        onRequireLogin?.();
        return;
      }
      const updateId = listItemUpdateId.trim();
      if (!updateId) {
        return;
      }
      setBusy(true);
      try {
        const op = buildOdlUpdateVoteOp({
          id: odlCustomJsonId,
          updateId,
          objectId: catalogObjectId,
          voter,
          vote: 'against',
          required_posting_auths: [voter],
        });
        const { transactionId } = await getWalletFacade().broadcast({
          operations: [op],
        });
        void awaitTrxConfirmation(transactionId).finally(() => {
          void refreshAfterBroadcast(router, () =>
            revalidateObjectAfterBroadcast(catalogObjectId),
          );
        });
      } finally {
        setBusy(false);
      }
    },
    [catalogObjectId, odlCustomJsonId, onRequireLogin, router, viewerUsername],
  );

  return { addListItem, rejectListItem, busy, actionError };
}
