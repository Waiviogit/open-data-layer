'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';

import { OBJECT_TYPE_REGISTRY } from '@opden-data-layer/core/object-type-registry';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { useInstantNavigation } from '@/shared/presentation';

import { useObjectCreateForm } from '../../application/use-object-create-form';
import {
  applyObjectCreateStepToSearchParams,
  objectCreateUrlIndicatesEditStep,
  readObjectCreateTypeFromUrl,
  type ObjectCreateStep,
} from '../../domain/object-create-url';
import { labelForObjectType } from '../../domain/object-type-display';
import { planObjectCreateUrlSync } from '../../domain/object-create-url-sync';
import { CoreFieldsEditor } from './core-fields-editor';
import { MediaEditor } from './media-editor';
import { ObjectCreateContentLocalePanel } from './object-create-content-locale-panel';
import { ObjectCreateHeader } from './object-create-header';
import { ObjectHealthPanel } from './object-health-panel';
import { ObjectPreviewPanel } from './object-preview-panel';
import { PendingOpsDock } from './pending-ops-dock';
import { ObjectTypeSelector } from './object-type-selector';
import { RelationsEditor } from './relations-editor';

export type ObjectCreateClientProps = {
  username: string;
  /** Server-generated prefix so SSR and hydration match. */
  initialObjectIdPrefix: string;
  /** Validated `/editor?...` path when opened from post editor. */
  editorReturnPath?: string | null;
};

export function ObjectCreateClient({
  username,
  initialObjectIdPrefix,
  editorReturnPath = null,
}: ObjectCreateClientProps) {
  const { t } = useI18n();
  const { navigateInstant } = useInstantNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const form = useObjectCreateForm({
    username,
    initialObjectIdPrefix,
    editorReturnPath,
  });

  const urlWantsEdit = objectCreateUrlIndicatesEditStep(searchParams);
  const urlObjectType = readObjectCreateTypeFromUrl(searchParams);
  const urlObjectTypeValid =
    urlObjectType !== null && Boolean(OBJECT_TYPE_REGISTRY[urlObjectType]);

  const setStep = useCallback(
    (
      next: ObjectCreateStep,
      objectType?: string | null,
      options?: { replace?: boolean },
    ) => {
      const params = applyObjectCreateStepToSearchParams(
        new URLSearchParams(searchParams.toString()),
        next,
        objectType,
      );
      const qs = params.toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      navigateInstant({
        href,
        method: options?.replace ? 'replace' : 'push',
        scroll: false,
      });
    },
    [navigateInstant, pathname, searchParams],
  );

  const activeObjectType =
    form.state.objectType ?? (urlObjectTypeValid ? urlObjectType : null);

  useEffect(() => {
    const action = planObjectCreateUrlSync({
      draftHydrated: form.draftHydrated,
      urlWantsEdit,
      urlObjectType,
      urlObjectTypeValid,
      stateObjectType: form.state.objectType,
    });
    switch (action.kind) {
      case 'sync_url_to_state':
        setStep('edit-fields', action.objectType, { replace: true });
        break;
      case 'apply_url_type':
        form.setObjectType(action.objectType);
        break;
      case 'go_select_type':
        setStep('select-type', null, { replace: true });
        break;
      default:
        break;
    }
  }, [
    form.draftHydrated,
    form.state.objectType,
    form.setObjectType,
    urlObjectType,
    urlObjectTypeValid,
    urlWantsEdit,
    setStep,
  ]);

  const step: ObjectCreateStep =
    urlWantsEdit && (activeObjectType || urlObjectTypeValid)
      ? 'edit-fields'
      : 'select-type';

  const awaitingDraftForEditUrl =
    urlWantsEdit && !form.draftHydrated;

  if (awaitingDraftForEditUrl) {
    return (
      <div
        className="w-full py-section-y-sm"
        aria-busy="true"
        aria-live="polite"
      />
    );
  }

  if (step === 'select-type') {
    return (
      <div className="w-full py-section-y-sm">
        <header className="mb-5 border-b border-border pb-4">
          <h1 className="text-section font-display font-weight-strong text-heading">
            {t('object_create_select_type_title')}
          </h1>
          <p className="mt-1 text-body-sm text-fg-secondary">
            {t('object_create_select_type_subtitle')}
          </p>
        </header>
        <ObjectTypeSelector
          onSelect={(type) => {
            flushSync(() => {
              form.setObjectType(type);
            });
            setStep('edit-fields', type);
          }}
          disabled={form.submitting}
        />
      </div>
    );
  }

  const typeLabel = activeObjectType
    ? labelForObjectType(activeObjectType)
    : undefined;

  return (
    <>
      <div className="w-full py-section-y-sm pb-[calc(var(--shell-header-height,4rem)+0.75rem)]">
        <ObjectCreateHeader
          state={form.state}
          submitting={form.submitting}
          idExists={form.idExists}
          idCheckPending={form.idCheckPending}
          typeLabel={typeLabel}
          onClearAll={() => {
            const hasWork =
              form.state.objectType !== null || form.state.fields.length > 0;
            if (
              hasWork &&
              !window.confirm(t('object_create_clear_all_confirm'))
            ) {
              return;
            }
            form.clearAll();
            setStep('select-type');
          }}
        />

        <button
          type="button"
          onClick={() => {
            form.resetForTypeSelection();
            setStep('select-type');
          }}
          disabled={form.submitting}
          className="mb-4 text-body-sm text-muted hover:text-fg disabled:opacity-50"
        >
          ← {t('object_create_change_type')}
        </button>

        {form.error ? (
          <p className="mb-4 text-body-sm text-accent" role="alert">
            {form.error === 'validation'
              ? t('object_edit_validation_error')
              : form.error === 'publish_failed'
                ? t('create_object_error')
                : form.error}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] lg:items-start">
          <div className="space-y-6">
            {activeObjectType ? (
              <>
                <CoreFieldsEditor
                  objectType={activeObjectType}
                  fields={form.state.fields}
                  tagCategoryNames={form.tagCategoryNames}
                  galleryAlbumNames={form.galleryAlbumNames}
                  onUpdateField={form.updateField}
                  onAddField={form.addField}
                  onRemoveField={form.removeField}
                  disabled={form.submitting}
                />
                <RelationsEditor
                  objectType={activeObjectType}
                  fields={form.state.fields}
                  onUpdateField={form.updateField}
                  onAddField={form.addField}
                  disabled={form.submitting}
                />
                <MediaEditor
                  objectType={activeObjectType}
                  fields={form.state.fields}
                  tagCategoryNames={form.tagCategoryNames}
                  galleryAlbumNames={form.galleryAlbumNames}
                  onUpdateField={form.updateField}
                  onAddField={form.addField}
                  disabled={form.submitting}
                />
              </>
            ) : (
              <p className="text-body-sm text-muted">
                {t('object_create_select_type_hint')}
              </p>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-[calc(var(--app-header-height,4rem)+1rem)]">
            <ObjectPreviewPanel
              objectType={activeObjectType}
              objectId={form.state.objectId}
              fields={form.state.fields}
            />
            <ObjectCreateContentLocalePanel
              language={form.state.language}
              submitting={form.submitting}
              onLanguageChange={form.setLanguage}
            />
            <ObjectHealthPanel completeness={form.completeness} />
          </aside>
        </div>
      </div>
      <PendingOpsDock
        fields={form.state.fields}
        canPublish={form.canPublish}
        submitting={form.submitting}
        disabled={form.submitting}
        broadcastViaIpfs={form.broadcastViaIpfs}
        publishPhase={form.publishPhase}
        jsonBytes={form.broadcastSize?.bytes}
        opCount={form.broadcastSize?.opCount}
        ipfsObjectId={form.broadcastSize?.ipfsObjectId ?? null}
        onToggleBroadcastViaIpfs={() => form.setBroadcastViaIpfs((v) => !v)}
        onPublish={() => void form.submit()}
      />
    </>
  );
}
