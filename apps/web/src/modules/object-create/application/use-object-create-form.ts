'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import { buildOdlBatchImportOp } from '@opden-data-layer/hive-broadcast';

import { DEFAULT_LOCALE } from '@/i18n/config/default-locale';
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
import { buildCreateOdlJson, buildCreateOps } from './build-create-ops';
import {
  clearObjectCreateDraft,
  loadObjectCreateDraft,
  saveObjectCreateDraft,
} from './object-create-draft.storage';
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
import { checkObjectIdExists } from '../infrastructure/actions/check-object-id.action';

const AUTOSAVE_DEBOUNCE_MS = 600;

function normalizeFieldEntries(fields: FieldEntry[]): FieldEntry[] {
  return fields.map((f, index) => ({
    ...f,
    entryKey: f.entryKey ?? `${f.updateType}:${index}`,
  }));
}

function nameFromFields(fields: readonly FieldEntry[]): string {
  const entry = fields.find((f) => f.updateType === UPDATE_TYPES.NAME);
  if (!entry || typeof entry.value !== 'string') {
    return '';
  }
  return entry.value;
}

function resolvePrefixFromDraft(
  draft: Partial<ObjectCreateState> | null,
  fallback: string,
): string {
  if (draft?.objectIdPrefix && /^[a-z]{3}$/.test(draft.objectIdPrefix)) {
    return draft.objectIdPrefix;
  }
  const match = draft?.objectId?.match(/^([a-z]{3})(?:-|$)/);
  if (match?.[1]) {
    return match[1];
  }
  return fallback;
}

function emptyObjectCreateState(prefix: string): ObjectCreateState {
  return {
    objectIdPrefix: prefix,
    objectId: prefix,
    objectType: null,
    fields: [],
    language: DEFAULT_LOCALE,
  };
}

function isEmptyWorkspace(state: ObjectCreateState): boolean {
  return !state.objectType && state.fields.length === 0;
}

function mergeDraft(username: string, defaultPrefix: string): ObjectCreateState {
  const draft = loadObjectCreateDraft(username);
  const objectIdPrefix = resolvePrefixFromDraft(draft, defaultPrefix);
  const language = draft?.language ?? DEFAULT_LOCALE;
  const rawFields = normalizeFieldEntries(draft?.fields ?? []);
  const fields = applyContentLocaleToFields(rawFields, language);
  const name = nameFromFields(fields);
  const objectId =
    draft?.objectId && draft.objectId.length > 0
      ? draft.objectId
      : buildObjectId(objectIdPrefix, name);

  return {
    objectIdPrefix,
    objectId,
    objectType: draft?.objectType ?? null,
    fields,
    language,
  };
}

export type UseObjectCreateFormOptions = {
  username: string;
  initialObjectIdPrefix: string;
};

export function useObjectCreateForm({
  username,
  initialObjectIdPrefix,
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

  useEffect(() => {
    skipAutosaveRef.current = true;
    setState(mergeDraft(username, initialObjectIdPrefix));
    setDraftSavedAt(null);
  }, [username, initialObjectIdPrefix]);

  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (isEmptyWorkspace(state)) {
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
      return { bytes, opCount: ops.length };
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

  const setObjectType = useCallback((objectType: string) => {
    if (!OBJECT_TYPE_REGISTRY[objectType]) {
      return;
    }
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
  }, []);

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
      const albumNames = listGalleryAlbumNamesFromFields(prev.fields);
      if (
        updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM &&
        albumNames.length === 0
      ) {
        return prev;
      }
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

      let transactionId: string;

      if (broadcastViaIpfs) {
        const odlJson = buildCreateOdlJson(createParams);
        const ipfsResult = await uploadOdlToIpfs(odlJson);
        if ('error' in ipfsResult) {
          throw new Error(ipfsResult.error);
        }
        setPublishPhase('signing');
        const batchOp = buildOdlBatchImportOp({
          id: odlCustomJsonId,
          account: username,
          cid: ipfsResult.cid,
        });
        ({ transactionId } = await getWalletFacade().broadcast({
          operations: [batchOp],
        }));
        setPublishPhase('confirming');
        await awaitTrxConfirmation(transactionId);
        setPublishPhase('importing');
        await awaitBatchImportCompletion(transactionId, state.objectId);
      } else {
        const ops = buildCreateOps(createParams);
        ({ transactionId } = await getWalletFacade().broadcast({
          operations: ops,
        }));
        setPublishPhase('confirming');
        await awaitTrxConfirmation(transactionId);
        setPublishPhase('importing');
        await awaitObjectIndexed(state.objectId);
      }

      clearObjectCreateDraft(username);
      setDraftSavedAt(null);
      await refreshAfterBroadcast(router, () =>
        revalidateObjectAfterBroadcast(state.objectId),
      );
      router.push(`/object/${encodeURIComponent(state.objectId)}`);
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
  ]);

  return {
    state,
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
