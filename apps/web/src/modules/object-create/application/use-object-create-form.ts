'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import { buildOdlBatchImportOp } from '@opden-data-layer/hive-broadcast';

import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import {
  awaitBatchImportCompletion,
  awaitObjectIndexed,
  awaitTrxConfirmation,
} from '@/modules/notifications';
import { initialFormValueForUpdateTypeWithContext } from '@/modules/object-updates/application/tag-category-item-form-value';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';

import { uploadOdlToIpfs } from '../infrastructure/actions/upload-odl-to-ipfs.action';
import {
  buildCreateOdlJson,
  buildCreateOps,
  parseObjectIdFromCreateOdlJson,
} from './build-create-ops';
import { isCreateChunkingOverflowError } from './is-create-chunking-overflow-error';
import {
  clearObjectCreateDraft,
  saveObjectCreateDraft,
} from './object-create-draft.storage';
import {
  emptyObjectCreateState,
  isEmptyObjectCreateWorkspace,
  resolveInitialObjectCreateState,
} from './object-create-initial-state';
import type { AddFieldOptions } from '../domain/add-field-options';
import {
  applyContentLocaleToFields,
  isLocalizableUpdateType,
} from '../domain/field-content-locale';
import { isDuplicateRefValue } from '../domain/duplicate-ref-field-values';
import {
  buildObjectId,
  generatePrefix,
} from '../domain/generate-object-id';
import {
  computeObjectHealthScore,
  validatePublishReadiness,
} from '../domain/object-health-score';
import { computeSemanticCompleteness } from '../domain/semantic-completeness';
import type { FieldEntry, ObjectCreateState } from '../domain/object-create.types';
import {
  listGalleryAlbumNamesFromFields,
  listTagCategoryNamesFromFields,
  seedFieldsForObjectType,
} from '../domain/supposed-update-seeds';
import { appendAttachObjectToEditorPath } from '@/modules/editor/domain/post-editor-object-create-return';

import { checkObjectIdExists } from '../infrastructure/actions/check-object-id.action';

const AUTOSAVE_DEBOUNCE_MS = 600;

export type UseObjectCreateFormOptions = {
  username: string;
  initialObjectIdPrefix: string;
  editorReturnPath?: string | null;
};

export function useObjectCreateForm({
  username,
  initialObjectIdPrefix,
  editorReturnPath = null,
}: UseObjectCreateFormOptions) {
  useHydrateWalletProvider();
  const router = useRouter();
  const odlCustomJsonId = useOdlCustomJsonId();

  const [state, setState] = useState<ObjectCreateState>(() =>
    emptyObjectCreateState(initialObjectIdPrefix),
  );
  const [submitting, setSubmitting] = useState(false);
  const [broadcastViaIpfs, setBroadcastViaIpfs] = useState(false);
  const [publishPhase, setPublishPhase] = useState<
    'idle' | 'uploading' | 'signing' | 'confirming' | 'importing'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [idExists, setIdExists] = useState<boolean | null>(null);
  const [idCheckPending, setIdCheckPending] = useState(false);

  const skipAutosaveRef = useRef(true);
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    skipAutosaveRef.current = true;
    setState(
      resolveInitialObjectCreateState(
        username,
        initialObjectIdPrefix,
        editorReturnPath,
      ),
    );
    setDraftSavedAt(null);
    setDraftHydrated(true);
  }, [username, initialObjectIdPrefix, editorReturnPath]);

  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (isEmptyObjectCreateWorkspace(state)) {
        clearObjectCreateDraft(username);
        setDraftSavedAt(null);
        return;
      }
      saveObjectCreateDraft(username, state);
      setDraftSavedAt(Date.now());
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [state, username]);

  const healthScore = useMemo(
    () => computeObjectHealthScore(state.objectType, state.fields),
    [state.objectType, state.fields],
  );

  const completeness = useMemo(
    () => computeSemanticCompleteness(state.objectType, state.fields),
    [state.objectType, state.fields],
  );

  const publishReadiness = useMemo(
    () =>
      validatePublishReadiness(
        state.objectType,
        state.fields,
        state.objectId,
        state.objectIdPrefix,
      ),
    [state.objectType, state.fields, state.objectId, state.objectIdPrefix],
  );

  const canPublish = publishReadiness.ready && idExists !== true;

  const tagCategoryNames = useMemo(
    () => listTagCategoryNamesFromFields(state.fields),
    [state.fields],
  );

  const galleryAlbumNames = useMemo(
    () => listGalleryAlbumNamesFromFields(state.fields),
    [state.fields],
  );

  const broadcastSize = useMemo(() => {
    if (!state.objectType) {
      return null;
    }
    try {
      const params = {
        objectId: state.objectId,
        objectType: state.objectType,
        creator: username,
        odlCustomJsonId,
        fields: state.fields,
        language: state.language,
      };
      const odlJson = buildCreateOdlJson(params);
      const bytes = new TextEncoder().encode(odlJson).length;
      const ops = buildCreateOps(params);
      const ipfsObjectId = parseObjectIdFromCreateOdlJson(odlJson);
      return { bytes, opCount: ops.length, ipfsObjectId };
    } catch {
      return null;
    }
  }, [
    state.objectId,
    state.objectType,
    state.fields,
    state.language,
    username,
    odlCustomJsonId,
  ]);

  useEffect(() => {
    const slugPart = state.objectId.slice(state.objectIdPrefix.length);
    const hasSlug = slugPart.startsWith('-') && slugPart.length > 1;
    if (!hasSlug) {
      setIdExists(null);
      setIdCheckPending(false);
      return;
    }

    setIdCheckPending(true);
    const timer = setTimeout(() => {
      void checkObjectIdExists(state.objectId).then((exists) => {
        setIdExists(exists);
        setIdCheckPending(false);
      });
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  }, [state.objectId, state.objectIdPrefix]);

  const setObjectType = useCallback(
    (objectType: string) => {
      if (!OBJECT_TYPE_REGISTRY[objectType]) {
        return;
      }
      skipAutosaveRef.current = true;
      clearObjectCreateDraft(username);
      const prefix = generatePrefix();
      setState((prev) => {
        const fields = applyContentLocaleToFields(
          seedFieldsForObjectType(objectType, prev.language),
          prev.language,
        );
        return {
          ...prev,
          objectType,
          objectIdPrefix: prefix,
          objectId: prefix,
          fields,
        };
      });
      setIdExists(null);
      setError(null);
      queueMicrotask(() => {
        skipAutosaveRef.current = false;
      });
    },
    [username],
  );

  const resetForTypeSelection = useCallback(() => {
    skipAutosaveRef.current = true;
    clearObjectCreateDraft(username);
    setState((prev) => ({
      ...emptyObjectCreateState(prev.objectIdPrefix),
      language: prev.language,
    }));
    setDraftSavedAt(null);
    setIdExists(null);
    setIdCheckPending(false);
    setError(null);
    queueMicrotask(() => {
      skipAutosaveRef.current = false;
    });
  }, [username]);

  const setLanguage = useCallback((language: string) => {
    setState((prev) => ({
      ...prev,
      language,
      fields: applyContentLocaleToFields(prev.fields, language),
    }));
  }, []);

  const clearAll = useCallback(() => {
    clearObjectCreateDraft(username);
    const prefix = generatePrefix();
    skipAutosaveRef.current = true;
    setState(emptyObjectCreateState(prefix));
    setDraftSavedAt(null);
    setIdExists(null);
    setIdCheckPending(false);
    setError(null);
    queueMicrotask(() => {
      skipAutosaveRef.current = false;
    });
  }, [username]);

  const updateField = useCallback(
    (entryKey: string, value: unknown, locale?: string) => {
      setState((prev) => {
        const idx = prev.fields.findIndex((f) => f.entryKey === entryKey);
        if (idx < 0) {
          return prev;
        }
        const next = [...prev.fields];
        const current = next[idx];
        if (!current) {
          return prev;
        }
        if (
          isDuplicateRefValue(
            prev.fields,
            current.updateType,
            entryKey,
            value,
          )
        ) {
          return prev;
        }
        next[idx] = {
          ...current,
          value,
          ...(isLocalizableUpdateType(current.updateType)
            ? { locale: locale ?? prev.language }
            : {}),
        };

        let objectId = prev.objectId;
        if (current.updateType === UPDATE_TYPES.NAME) {
          const name =
            typeof value === 'string' ? value : String(value ?? '');
          objectId = buildObjectId(prev.objectIdPrefix, name);
        }

        return { ...prev, fields: next, objectId };
      });
    },
    [],
  );

  const addField = useCallback((updateType: string, options?: AddFieldOptions) => {
    setState((prev) => {
      const tagNames = listTagCategoryNamesFromFields(prev.fields);
      if (
        updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM &&
        tagNames.length === 0
      ) {
        return prev;
      }
      const suffix =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().slice(0, 8)
          : String(Date.now());
      const entryKey =
        options?.entryKey ??
        (options?.galleryAlbum
          ? `${updateType}:${options.galleryAlbum}:${suffix}`
          : options?.tagCategory
            ? `${updateType}:${options.tagCategory}:${suffix}`
            : `${updateType}:${suffix}`);
      const newEntry: FieldEntry = {
        entryKey,
        updateType,
        value: initialFormValueForUpdateTypeWithContext(
          updateType,
          tagNames,
          options?.galleryAlbum,
          options?.tagCategory,
        ),
        ...(isLocalizableUpdateType(updateType)
          ? { locale: prev.language }
          : {}),
      };
      const nextFields =
        updateType === UPDATE_TYPES.TAG_CATEGORY_ITEM
          ? [newEntry, ...prev.fields]
          : [...prev.fields, newEntry];
      return {
        ...prev,
        fields: nextFields,
      };
    });
  }, []);

  const removeField = useCallback((entryKey: string) => {
    setState((prev) => {
      const removed = prev.fields.find((f) => f.entryKey === entryKey);
      const nextFields = prev.fields.filter((f) => f.entryKey !== entryKey);
      let objectId = prev.objectId;
      if (removed?.updateType === UPDATE_TYPES.NAME) {
        objectId = buildObjectId(prev.objectIdPrefix, '');
      }
      return { ...prev, fields: nextFields, objectId };
    });
  }, []);

  const submit = useCallback(async () => {
    if (submitting || idExists === true) {
      return;
    }

    const readiness = validatePublishReadiness(
      state.objectType,
      state.fields,
      state.objectId,
      state.objectIdPrefix,
    );
    if (!readiness.ready) {
      setError('validation');
      return;
    }

    if (!state.objectType) {
      return;
    }

    setSubmitting(true);
    setPublishPhase(broadcastViaIpfs ? 'uploading' : 'signing');
    setError(null);
    try {
      const createParams = {
        objectId: state.objectId,
        objectType: state.objectType,
        creator: username,
        odlCustomJsonId,
        fields: state.fields,
        language: state.language,
      };

      const publishViaIpfsBatch = async (): Promise<string> => {
        const odlJson = buildCreateOdlJson(createParams);
        const ipfsObjectId = parseObjectIdFromCreateOdlJson(odlJson);
        if (ipfsObjectId !== createParams.objectId) {
          throw new Error('object_id_mismatch');
        }
        const ipfsResult = await uploadOdlToIpfs(odlJson, createParams.objectId);
        if ('error' in ipfsResult) {
          throw new Error(ipfsResult.error);
        }
        setPublishPhase('signing');
        const batchOp = buildOdlBatchImportOp({
          id: odlCustomJsonId,
          account: username,
          cid: ipfsResult.cid,
        });
        const { transactionId: trxId } = await getWalletFacade().broadcast({
          operations: [batchOp],
        });
        setPublishPhase('confirming');
        await awaitTrxConfirmation(trxId);
        setPublishPhase('importing');
        await awaitBatchImportCompletion(trxId, state.objectId);
        return trxId;
      };

      if (broadcastViaIpfs) {
        setPublishPhase('uploading');
        await publishViaIpfsBatch();
      } else {
        try {
          const ops = buildCreateOps(createParams);
          const { transactionId } = await getWalletFacade().broadcast({
            operations: ops,
          });
          setPublishPhase('confirming');
          await awaitTrxConfirmation(transactionId);
          setPublishPhase('importing');
          await awaitObjectIndexed(state.objectId);
        } catch (err) {
          if (!isCreateChunkingOverflowError(err)) {
            throw err;
          }
          setPublishPhase('uploading');
          await publishViaIpfsBatch();
        }
      }

      clearObjectCreateDraft(username);
      setDraftSavedAt(null);
      await refreshAfterBroadcast(router, () =>
        revalidateObjectAfterBroadcast(state.objectId),
      );
      if (editorReturnPath) {
        router.push(
          appendAttachObjectToEditorPath(editorReturnPath, state.objectId),
        );
      } else {
        router.push(`/object/${encodeURIComponent(state.objectId)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'publish_failed');
      setSubmitting(false);
      setPublishPhase('idle');
    }
  }, [
    state,
    submitting,
    idExists,
    username,
    odlCustomJsonId,
    router,
    broadcastViaIpfs,
    editorReturnPath,
  ]);

  return {
    state,
    draftHydrated,
    healthScore,
    completeness,
    canPublish,
    tagCategoryNames,
    galleryAlbumNames,
    submitting,
    error,
    draftSavedAt,
    idExists,
    idCheckPending,
    setObjectType,
    resetForTypeSelection,
    setLanguage,
    clearAll,
    updateField,
    addField,
    removeField,
    submit,
    broadcastViaIpfs,
    setBroadcastViaIpfs,
    publishPhase,
    broadcastSize,
  };
}
