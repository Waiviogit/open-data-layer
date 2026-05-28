'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { useObjectCreateForm } from '../../application/use-object-create-form';
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
};

export function ObjectCreateClient({
  username,
  initialObjectIdPrefix,
}: ObjectCreateClientProps) {
  const { t } = useI18n();
  const form = useObjectCreateForm({ username, initialObjectIdPrefix });

  return (
    <>
    <div className="w-full py-section-y-sm pb-[calc(var(--shell-header-height,4rem)+0.75rem)]">
      <ObjectCreateHeader
        state={form.state}
        submitting={form.submitting}
        idExists={form.idExists}
        idCheckPending={form.idCheckPending}
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
        }}
      />

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
          <ObjectTypeSelector
            selectedType={form.state.objectType}
            onSelect={form.setObjectType}
            disabled={form.submitting}
          />

          {form.state.objectType ? (
            <>
              <CoreFieldsEditor
                objectType={form.state.objectType}
                fields={form.state.fields}
                tagCategoryNames={form.tagCategoryNames}
                galleryAlbumNames={form.galleryAlbumNames}
                onUpdateField={form.updateField}
                onAddField={form.addField}
                onRemoveField={form.removeField}
                disabled={form.submitting}
              />
              <RelationsEditor
                objectType={form.state.objectType}
                fields={form.state.fields}
                onUpdateField={form.updateField}
                onAddField={form.addField}
                disabled={form.submitting}
              />
              <MediaEditor
                objectType={form.state.objectType}
                fields={form.state.fields}
                tagCategoryNames={form.tagCategoryNames}
                galleryAlbumNames={form.galleryAlbumNames}
                onUpdateField={form.updateField}
                onAddField={form.addField}
                disabled={form.submitting}
              />

            </>
          ) : (
            <p className="text-body-sm text-muted">{t('object_create_select_type_hint')}</p>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--app-header-height,4rem)+1rem)]">
          <ObjectPreviewPanel
            objectType={form.state.objectType}
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
      onPublish={() => void form.submit()}
    />
    </>
  );
}
