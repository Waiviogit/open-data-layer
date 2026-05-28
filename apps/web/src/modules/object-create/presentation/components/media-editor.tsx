'use client';

import { useMemo } from 'react';

import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';
import { UpdateValueForm } from '@/modules/object-updates/presentation/components/update-value-form';

import type { AddFieldOptions } from '../../domain/add-field-options';
import {
  groupFieldsByPriority,
  mediaTypesForObjectType,
} from '../../domain/group-fields-by-priority';
import type { FieldEntry } from '../../domain/object-create.types';

function noopValidity(): void {
  // Media validity is tracked via the shared fields list / health score.
}

export type MediaEditorProps = {
  objectType: string;
  fields: readonly FieldEntry[];
  tagCategoryNames: readonly string[];
  galleryAlbumNames: readonly string[];
  onUpdateField: (entryKey: string, value: unknown) => void;
  onAddField: (updateType: string, options?: AddFieldOptions) => void;
  disabled?: boolean;
};

function albumNameFromGalleryItem(entry: FieldEntry): string | null {
  const raw = entry.value;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const album = (raw as Record<string, unknown>).album;
  return typeof album === 'string' && album.trim().length > 0 ? album.trim() : null;
}

function lockGalleryAlbumForEntry(
  entry: FieldEntry,
  galleryAlbumNames: readonly string[],
): boolean {
  const match = entry.entryKey.match(/^imageGalleryItem:([^:]+):/);
  return Boolean(
    match?.[1] && galleryAlbumNames.includes(match[1]),
  );
}

export function MediaEditor({
  objectType,
  fields,
  tagCategoryNames,
  galleryAlbumNames,
  onUpdateField,
  onAddField,
  disabled = false,
}: MediaEditorProps) {
  const { t } = useI18n();
  const mediaTypes = useMemo(
    () => mediaTypesForObjectType(objectType),
    [objectType],
  );

  const requiredMediaTypes = useMemo(() => {
    const required = new Set(groupFieldsByPriority(objectType).required);
    return new Set(mediaTypes.filter((t) => required.has(t)));
  }, [objectType, mediaTypes]);

  const simpleMediaTypes = useMemo(
    () =>
      mediaTypes.filter(
        (t) =>
          !requiredMediaTypes.has(t) &&
          t !== UPDATE_TYPES.IMAGE_GALLERY &&
          t !== UPDATE_TYPES.IMAGE_GALLERY_ITEM,
      ),
    [mediaTypes, requiredMediaTypes],
  );

  const supportsGalleryAlbum = mediaTypes.includes(UPDATE_TYPES.IMAGE_GALLERY);
  const supportsGalleryItem = mediaTypes.includes(UPDATE_TYPES.IMAGE_GALLERY_ITEM);

  const albumEntries = useMemo(
    () => fields.filter((f) => f.updateType === UPDATE_TYPES.IMAGE_GALLERY),
    [fields],
  );

  const galleryItemEntries = useMemo(
    () => fields.filter((f) => f.updateType === UPDATE_TYPES.IMAGE_GALLERY_ITEM),
    [fields],
  );

  const namedAlbums = useMemo(() => {
    const fromFields = galleryAlbumNames;
    const fromItems = galleryItemEntries
      .map((e) => albumNameFromGalleryItem(e))
      .filter((n): n is string => Boolean(n));
    const seen = new Set<string>();
    const out: string[] = [];
    for (const name of [...fromFields, ...fromItems]) {
      if (!seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
    return out;
  }, [galleryAlbumNames, galleryItemEntries]);

  if (mediaTypes.length === 0) {
    return null;
  }

  return (
    <section className="rounded-card border border-border bg-surface p-card-padding">
      <h2 className="text-section font-display text-heading">
        {t('object_create_media')}
      </h2>
      <p className="mt-1 text-body-sm text-fg-secondary">
        {t('object_create_media_hint')}
      </p>

      <div
        className="mt-4 rounded-btn border border-dashed border-border bg-bg p-6"
        aria-label={t('object_create_media_drop')}
      >
        <div className="space-y-6">
          {simpleMediaTypes.map((updateType) => {
            const rows = fields.filter((f) => f.updateType === updateType);
            if (rows.length === 0) {
              return (
                <button
                  key={updateType}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAddField(updateType)}
                  className="block text-body-sm text-accent hover:underline"
                >
                  + {labelForUpdateType(updateType)}
                </button>
              );
            }
            return rows.map((entry) => (
              <div key={entry.entryKey}>
                <p className="mb-2 text-body-sm font-medium text-fg">
                  {labelForUpdateType(updateType)}
                </p>
                <UpdateValueForm
                  updateType={updateType}
                  value={entry.value}
                  onChange={(v) => onUpdateField(entry.entryKey, v)}
                  onValidityChange={noopValidity}
                  tagCategoryNames={tagCategoryNames}
                  galleryAlbumNames={galleryAlbumNames}
                  hideUpdateTypeHeading
                />
              </div>
            ));
          })}

          {supportsGalleryAlbum || supportsGalleryItem ? (
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-body-sm font-medium text-fg">
                {t('gallery')}
              </p>

              {albumEntries.map((entry) => (
                <div key={entry.entryKey} className="rounded-btn border border-border-subtle bg-surface/40 p-4">
                  <p className="mb-2 text-body-sm font-medium text-heading">
                    {labelForUpdateType(UPDATE_TYPES.IMAGE_GALLERY)}
                  </p>
                  <UpdateValueForm
                    updateType={UPDATE_TYPES.IMAGE_GALLERY}
                    value={entry.value}
                    onChange={(v) => onUpdateField(entry.entryKey, v)}
                    onValidityChange={noopValidity}
                    tagCategoryNames={tagCategoryNames}
                    galleryAlbumNames={galleryAlbumNames}
                    hideUpdateTypeHeading
                  />
                </div>
              ))}

              {supportsGalleryAlbum ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAddField(UPDATE_TYPES.IMAGE_GALLERY)}
                  className="text-body-sm text-accent hover:underline"
                >
                  + {t('add_new_album')}
                </button>
              ) : null}

              {namedAlbums.map((albumName) => {
                const items = galleryItemEntries.filter(
                  (e) => albumNameFromGalleryItem(e) === albumName,
                );
                return (
                  <div
                    key={albumName}
                    className="rounded-btn border border-border-subtle bg-bg p-4"
                  >
                    <p className="text-body-sm font-medium text-heading">
                      {albumName}
                    </p>
                    <div className="mt-3 space-y-4">
                      {items.map((entry) => (
                        <UpdateValueForm
                          key={entry.entryKey}
                          updateType={UPDATE_TYPES.IMAGE_GALLERY_ITEM}
                          value={entry.value}
                          onChange={(v) => onUpdateField(entry.entryKey, v)}
                          onValidityChange={noopValidity}
                          tagCategoryNames={tagCategoryNames}
                          galleryAlbumNames={galleryAlbumNames}
                          lockGalleryAlbum={lockGalleryAlbumForEntry(
                            entry,
                            galleryAlbumNames,
                          )}
                          hideUpdateTypeHeading
                        />
                      ))}
                      {supportsGalleryItem ? (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            onAddField(UPDATE_TYPES.IMAGE_GALLERY_ITEM, {
                              galleryAlbum: albumName,
                            })
                          }
                          className="text-body-sm text-accent hover:underline"
                        >
                          + {t('add_new_image')} ({albumName})
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {supportsGalleryItem && namedAlbums.length === 0 ? (
                <p className="text-body-sm text-muted" role="status">
                  {t('object_edit_gallery_item_no_albums')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
