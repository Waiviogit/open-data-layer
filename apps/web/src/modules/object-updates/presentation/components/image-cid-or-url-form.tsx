'use client';

import { useCallback, useRef, useState, useTransition } from 'react';

import { useIpfsContentBaseUrl } from '@/config/ipfs-content-base-provider';
import {
  extractCidFromContentGatewayUrl,
  imageContentUrlForCid,
} from '@/config/ipfs-content-url';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { uploadImageToIpfs } from '@/modules/object-create/infrastructure/actions/upload-image.action';
import { uploadImageFromUrl } from '@/modules/object-create/infrastructure/actions/upload-image-from-url.action';
import {
  imageFileFromClipboard,
  parseHttpUrlFromPaste,
} from '@/modules/object-updates/application/image-cid-or-url-paste';
import { useGlobalImagePaste } from '@/modules/object-updates/application/use-global-image-paste';

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

function previewUrlFromValue(
  value: unknown,
  contentBaseUrl: string,
): string | null {
  if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) {
    return value.trim();
  }
  const o = asRecord(value);
  const url = typeof o.url === 'string' ? o.url.trim() : '';
  if (url && /^https?:\/\//i.test(url)) {
    return url;
  }
  const cid = typeof o.cid === 'string' ? o.cid.trim() : '';
  if (cid && contentBaseUrl) {
    return imageContentUrlForCid(contentBaseUrl, cid);
  }
  return null;
}

const ZONE_BUTTON_CLASS =
  'flex min-h-[14rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-btn border border-dashed border-border bg-ghost-surface px-6 py-8 text-center transition-colors hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-wait disabled:opacity-60';

const ACTION_LINK_CLASS =
  'text-body-sm text-accent hover:underline disabled:pointer-events-none disabled:opacity-50';

export function ImageCidOrUrlForm({
  value,
  onChange,
  label,
  hideLegend = false,
}: ImageCidOrUrlFormProps) {
  const { t } = useI18n();
  const contentBaseUrl = useIpfsContentBaseUrl();
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrl =
    localPreviewUrl ?? previewUrlFromValue(value, contentBaseUrl);
  const hasImage = Boolean(previewUrl);

  const clearImage = useCallback(() => {
    setLocalPreviewUrl(null);
    setUploadError(null);
    setCopyFeedback('idle');
    onChange({});
  }, [onChange]);

  const importImageFromUrl = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      setUploadError(null);
      setCopyFeedback('idle');

      const gatewayCid = extractCidFromContentGatewayUrl(trimmed);
      if (gatewayCid && contentBaseUrl) {
        setLocalPreviewUrl(imageContentUrlForCid(contentBaseUrl, gatewayCid));
        onChange({ cid: gatewayCid });
        return;
      }

      setLocalPreviewUrl(trimmed);
      startTransition(async () => {
        const result = await uploadImageFromUrl(trimmed);
        if ('error' in result) {
          setLocalPreviewUrl(null);
          setUploadError(t('object_create_image_upload_error'));
          return;
        }
        setLocalPreviewUrl(result.previewUrl);
        onChange({ cid: result.cid });
      });
    },
    [contentBaseUrl, onChange, t],
  );

  const uploadFile = useCallback(
    (file: File) => {
      setUploadError(null);
      setCopyFeedback('idle');
      const formData = new FormData();
      formData.append('file', file);
      startTransition(async () => {
        const result = await uploadImageToIpfs(formData);
        if ('error' in result) {
          setUploadError(t('object_create_image_upload_error'));
          return;
        }
        setLocalPreviewUrl(result.previewUrl);
        onChange({ cid: result.cid });
      });
    },
    [onChange, t],
  );

  const { markActive } = useGlobalImagePaste({ uploadFile, importImageFromUrl, hasImage });

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) {
        uploadFile(file);
      }
    },
    [uploadFile],
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadFile(file);
      }
      e.target.value = '';
    },
    [uploadFile],
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const file = imageFileFromClipboard(e.clipboardData);
      if (file) {
        e.preventDefault();
        uploadFile(file);
        return;
      }
      const pastedUrl = parseHttpUrlFromPaste(
        e.clipboardData.getData('text/plain'),
      );
      if (pastedUrl) {
        e.preventDefault();
        importImageFromUrl(pastedUrl);
      }
    },
    [importImageFromUrl, uploadFile],
  );

  const copyDisplayUrl = useCallback(async () => {
    if (!previewUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopyFeedback('copied');
    } catch {
      setCopyFeedback('failed');
    }
  }, [previewUrl]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const zoneLegend = label ?? t('object_create_image_zone_title');

  return (
    <fieldset
      className="space-y-3 text-body-sm"
      onPointerEnter={markActive}
      onFocus={markActive}
    >
      {label && !hideLegend ? (
        <legend className="font-weight-label text-fg">{label}</legend>
      ) : hideLegend ? (
        <legend className="sr-only">{zoneLegend}</legend>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        onChange={onFileInputChange}
      />

      {hasImage ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-btn border border-border bg-ghost-surface">
            <img
              src={previewUrl ?? ''}
              alt=""
              className="max-h-64 min-h-[14rem] w-full object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              className={ACTION_LINK_CLASS}
              disabled={isPending}
              onClick={openFilePicker}
            >
              {t('object_create_image_change')}
            </button>
            <button
              type="button"
              className={ACTION_LINK_CLASS}
              disabled={!previewUrl}
              onClick={() => void copyDisplayUrl()}
            >
              {t('object_create_image_copy_url')}
            </button>
            <button
              type="button"
              className={ACTION_LINK_CLASS}
              onClick={clearImage}
            >
              {t('object_create_image_remove')}
            </button>
          </div>
          {copyFeedback === 'copied' ? (
            <p className="text-caption text-muted" role="status">
              {t('object_create_image_url_copied')}
            </p>
          ) : null}
          {copyFeedback === 'failed' ? (
            <p className="text-caption text-error" role="alert">
              {t('object_create_image_copy_failed')}
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          aria-label={zoneLegend}
          disabled={isPending}
          className={
            isDragOver
              ? `${ZONE_BUTTON_CLASS} border-accent/50 bg-accent/5`
              : ZONE_BUTTON_CLASS
          }
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onPaste={onPaste}
          onClick={openFilePicker}
        >
          {isPending ? (
            <p className="text-body-sm text-muted">
              {t('object_create_image_uploading')}
            </p>
          ) : (
            <>
              <p className="text-body-sm font-weight-label text-fg">
                {t('object_create_image_zone_title')}
              </p>
              <p className="text-body-sm text-muted">
                {t('object_create_image_drag_drop')}
              </p>
              <p className="text-body-sm text-muted">
                {t('object_create_image_click_upload')}
              </p>
              <p className="text-caption text-muted">
                {t('object_create_image_paste_hint')}
              </p>
            </>
          )}
        </button>
      )}

      {uploadError ? (
        <p className="text-caption text-error" role="alert">
          {uploadError}
        </p>
      ) : null}
    </fieldset>
  );
}
