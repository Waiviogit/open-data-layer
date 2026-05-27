'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';

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
  const url = typeof obj.url === 'string' ? obj.url : '';
  const cid = typeof obj.cid === 'string' ? obj.cid : '';

  function patch(next: Record<string, unknown>) {
    onChange({ ...obj, ...next });
  }

  const albumField = lockAlbum ? (
    <label className="block">
      <span className="font-medium text-fg">{t('album')}</span>
      <input
        type="text"
        readOnly
        className="mt-2 w-full rounded-btn border border-border bg-surface/60 px-3 py-2 text-fg"
        value={album}
      />
    </label>
  ) : albumNames.length > 0 ? (
    <label className="block">
      <span className="font-medium text-fg">{t('album')}</span>
      <select
        className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
        value={album && albumNames.includes(album) ? album : albumNames[0] ?? ''}
        onChange={(e) => patch({ album: e.target.value })}
      >
        {albumNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  ) : (
    <label className="block">
      <span className="font-medium text-fg">{t('album')}</span>
      <input
        type="text"
        className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
        value={album}
        onChange={(e) => patch({ album: e.target.value })}
      />
    </label>
  );

  return (
    <fieldset className="space-y-3 text-sm">
      {albumField}
      <label className="block">
        <span className="font-medium text-fg">{t('object_field_url')}</span>
        <input
          type="url"
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={url}
          onChange={(e) => patch({ url: e.target.value, cid: '' })}
          placeholder="https://"
        />
      </label>
      <label className="block">
        <span className="font-medium text-fg">CID</span>
        <input
          type="text"
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={cid}
          onChange={(e) => patch({ cid: e.target.value, url: '' })}
        />
      </label>
    </fieldset>
  );
}
