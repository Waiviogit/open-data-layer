'use client';

import { useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

export type ImageCidOrUrlFormProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  label?: string;
  hideLegend?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function previewUrlFromValue(value: unknown): string | null {
  if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) {
    return value.trim();
  }
  const o = asRecord(value);
  const url = typeof o.url === 'string' ? o.url.trim() : '';
  if (url && /^https?:\/\//i.test(url)) {
    return url;
  }
  return null;
}

export function ImageCidOrUrlForm({
  value,
  onChange,
  label,
  hideLegend = false,
}: ImageCidOrUrlFormProps) {
  const { t } = useI18n();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const obj = asRecord(value);
  const url = typeof obj.url === 'string' ? obj.url : '';
  const cid = typeof obj.cid === 'string' ? obj.cid : '';
  const previewUrl = previewUrlFromValue(value);

  function patch(next: Record<string, unknown>) {
    onChange({ ...obj, ...next });
  }

  return (
    <fieldset className="space-y-3 text-sm">
      {label && !hideLegend ? (
        <legend className="font-medium text-fg">{label}</legend>
      ) : hideLegend ? (
        <legend className="sr-only">{label ?? 'image'}</legend>
      ) : null}

      {previewUrl ? (
        <div className="overflow-hidden rounded-btn border border-border bg-ghost-surface">
          <img
            src={previewUrl}
            alt=""
            className="max-h-48 w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-btn border border-dashed border-border bg-ghost-surface text-caption text-muted">
          {t('object_create_preview_no_image')}
        </div>
      )}

      <label className="block">
        <span className="font-medium text-fg">{t('object_field_url')}</span>
        <input
          type="url"
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={url}
          placeholder="https://"
          onChange={(e) => patch({ url: e.target.value, cid: '' })}
        />
      </label>

      <button
        type="button"
        className="text-caption text-muted hover:text-fg"
        onClick={() => setAdvancedOpen((o) => !o)}
        aria-expanded={advancedOpen}
      >
        {t('object_create_image_advanced')}
      </button>

      {advancedOpen ? (
        <label className="block">
          <span className="text-muted">CID</span>
          <input
            type="text"
            className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 font-mono text-xs text-fg"
            value={cid}
            onChange={(e) => patch({ cid: e.target.value, url: '' })}
          />
        </label>
      ) : null}
    </fieldset>
  );
}
