'use client';

import { useCallback, useEffect, useRef } from 'react';

import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { normalizeImageCidOrUrlFormValue } from '../../application/image-form-value';
import { imageEditorConfigForUpdateType } from '../../application/image-editor-config';
import {
  DEFAULT_GALLERY_PHOTOS_ALBUM_NAME,
  galleryAlbumPickerNames,
} from '../../application/gallery-form-value';
import { ImageCidOrUrlForm } from './image-cid-or-url-form';

export type ImageGalleryItemFormProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  /** Existing gallery album names on the object. */
  albumNames?: readonly string[];
  /** When set, album field is read-only (add image inside album view). */
  lockAlbum?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function ImageGalleryItemForm({
  value,
  onChange,
  albumNames = [],
  lockAlbum = false,
}: ImageGalleryItemFormProps) {
  const { t } = useI18n();
  const obj = asRecord(value);
  const album = typeof obj.album === 'string' ? obj.album : '';
  const pickerAlbumNames = galleryAlbumPickerNames(albumNames);

  const imageValue = {
    url: typeof obj.url === 'string' ? obj.url : undefined,
    cid: typeof obj.cid === 'string' ? obj.cid : undefined,
  };

  const objRef = useRef(obj);
  objRef.current = obj;

  const patchValue = useCallback(
    (patch: Record<string, unknown>) => {
      onChange({ ...objRef.current, ...patch });
    },
    [onChange],
  );

  const handleImageChange = useCallback(
    (imgValue: unknown) => {
      const img = asRecord(imgValue);
      const image = normalizeImageCidOrUrlFormValue({
        cid: img.cid,
        url: img.url,
      });
      const next = { ...objRef.current };
      delete next.cid;
      delete next.url;
      onChange({ ...next, ...image });
    },
    [onChange],
  );

  useEffect(() => {
    if (lockAlbum) {
      return;
    }
    const current =
      typeof objRef.current.album === 'string' ? objRef.current.album.trim() : '';
    if (!current && pickerAlbumNames[0]) {
      patchValue({ album: pickerAlbumNames[0] });
    }
  }, [lockAlbum, pickerAlbumNames, patchValue]);

  const albumField = lockAlbum ? (
    <label className="block text-body-sm">
      <span className="font-weight-label text-fg">{t('album')}</span>
      <input
        type="text"
        readOnly
        className="mt-2 w-full rounded-btn border border-border bg-surface/60 px-3 py-2 text-fg"
        value={album}
      />
    </label>
  ) : (
    <label className="block text-body-sm">
      <span className="font-weight-label text-fg">{t('album')}</span>
      <select
        className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
        value={album && pickerAlbumNames.includes(album) ? album : pickerAlbumNames[0] ?? DEFAULT_GALLERY_PHOTOS_ALBUM_NAME}
        onChange={(e) => patchValue({ album: e.target.value })}
      >
        {pickerAlbumNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-3">
      {albumField}
      <ImageCidOrUrlForm
        value={imageValue}
        onChange={handleImageChange}
        label={t('object_create_image_zone_title')}
        editorConfig={imageEditorConfigForUpdateType(UPDATE_TYPES.IMAGE_GALLERY_ITEM)}
        acceptVideoLinks
      />
    </div>
  );
}
