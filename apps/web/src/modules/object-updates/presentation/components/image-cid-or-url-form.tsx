'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useIpfsContentBaseUrl } from '@/config/ipfs-content-base-provider';
import {
  extractCidFromContentGatewayUrl,
  imageContentUrlForCid,
} from '@/config/ipfs-content-url';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { IpfsImageDropZone } from '@/shared/presentation';
import { ImageEditorPanel } from '@/shared/presentation/components/image-editor';
import type { ImageEditorConfig } from '@/shared/presentation/components/image-editor';
import { useIpfsImageUpload } from '@/shared/application';
import { base64ToBlob } from '@/shared/application/base64-to-blob';
import { fetchImageForEditor } from '@/modules/object-create/infrastructure/actions/fetch-image-for-editor.action';

import { parseVideoUrl } from '@/shared/infrastructure/video-preview';
import { VideoPreviewPlayer } from '@/shared/presentation/components/video-preview-player';

import { useGlobalImagePaste } from '@/modules/object-updates/application/use-global-image-paste';

export type ImageCidOrUrlFormProps = {
  value: unknown;
  onChange: (value: unknown) => void;
  label?: string;
  hideLegend?: boolean;
  editorConfig?: ImageEditorConfig;
  /** Gallery items store a share link instead of importing it as an image. */
  acceptVideoLinks?: boolean;
};

type EditorSource = {
  objectUrl: string;
  shouldRevoke: boolean;
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

const ACTION_LINK_CLASS =
  'text-body-sm text-accent hover:underline disabled:pointer-events-none disabled:opacity-50';

export function ImageCidOrUrlForm({
  value,
  onChange,
  label,
  hideLegend = false,
  editorConfig,
  acceptVideoLinks = false,
}: ImageCidOrUrlFormProps) {
  const { t } = useI18n();
  const contentBaseUrl = useIpfsContentBaseUrl();
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const [editorSource, setEditorSource] = useState<EditorSource | null>(null);
  const [isLoadingEditorSource, setIsLoadingEditorSource] = useState(false);
  const editorSourceRef = useRef<EditorSource | null>(null);
  editorSourceRef.current = editorSource;

  const previewUrl =
    localPreviewUrl ?? previewUrlFromValue(value, contentBaseUrl);
  const videoPreview = previewUrl ? parseVideoUrl(previewUrl) : null;
  const hasImage = Boolean(previewUrl) && !editorSource;
  const isSquarePreview = editorConfig?.aspectRatio === 1;

  const revokeEditorSource = useCallback((source: EditorSource | null) => {
    if (source?.shouldRevoke) {
      URL.revokeObjectURL(source.objectUrl);
    }
  }, []);

  const closeEditor = useCallback(() => {
    setEditorSource((prev) => {
      revokeEditorSource(prev);
      return null;
    });
  }, [revokeEditorSource]);

  useEffect(() => {
    return () => {
      revokeEditorSource(editorSourceRef.current);
    };
  }, [revokeEditorSource]);

  const onUploaded = useCallback(
    (result: { cid: string; previewUrl: string }) => {
      setLocalPreviewUrl(result.previewUrl);
      setCopyFeedback('idle');
      onChange({ cid: result.cid });
    },
    [onChange],
  );

  const { uploadFile, importFromUrl, isPending, uploadError, clearError } =
    useIpfsImageUpload(onUploaded);
  const [editorLoadError, setEditorLoadError] = useState<string | null>(null);

  const openEditorWithFile = useCallback(
    (file: File) => {
      closeEditor();
      const objectUrl = URL.createObjectURL(file);
      setEditorSource({ objectUrl, shouldRevoke: true });
    },
    [closeEditor],
  );

  const readCidFromValue = useCallback((): string => {
    const cid = asRecord(value).cid;
    return typeof cid === 'string' ? cid.trim() : '';
  }, [value]);

  const openEditorWithUrl = useCallback(
    async (url: string) => {
      if (url.startsWith('blob:')) {
        closeEditor();
        setEditorSource({ objectUrl: url, shouldRevoke: false });
        return;
      }

      closeEditor();
      setIsLoadingEditorSource(true);
      setEditorLoadError(null);
      clearError();
      try {
        const result = await fetchImageForEditor(url, readCidFromValue());
        if ('error' in result) {
          setEditorLoadError(t('object_create_image_upload_error'));
          return;
        }
        const blob = base64ToBlob(result.base64, result.mime);
        const objectUrl = URL.createObjectURL(blob);
        setEditorSource({ objectUrl, shouldRevoke: true });
      } catch {
        setEditorLoadError(t('object_create_image_upload_error'));
      } finally {
        setIsLoadingEditorSource(false);
      }
    },
    [clearError, closeEditor, readCidFromValue, t],
  );

  const handleIncomingFile = useCallback(
    (file: File) => {
      if (editorConfig) {
        openEditorWithFile(file);
        return;
      }
      uploadFile(file);
    },
    [editorConfig, openEditorWithFile, uploadFile],
  );

  const handleIncomingUrl = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (acceptVideoLinks && parseVideoUrl(trimmed)) {
        closeEditor();
        setEditorLoadError(null);
        clearError();
        setLocalPreviewUrl(trimmed);
        onChange({ url: trimmed });
        return;
      }
      const gatewayCid = extractCidFromContentGatewayUrl(trimmed);
      if (gatewayCid && contentBaseUrl) {
        onUploaded({
          cid: gatewayCid,
          previewUrl: imageContentUrlForCid(contentBaseUrl, gatewayCid),
        });
        return;
      }
      if (editorConfig) {
        void openEditorWithUrl(trimmed);
        return;
      }
      importFromUrl(trimmed);
    },
    [acceptVideoLinks, clearError, closeEditor, contentBaseUrl, editorConfig, importFromUrl, onChange, onUploaded, openEditorWithUrl],
  );

  const { markActive } = useGlobalImagePaste({
    uploadFile: handleIncomingFile,
    importImageFromUrl: handleIncomingUrl,
    hasImage: hasImage || Boolean(editorSource),
  });

  const clearImage = useCallback(() => {
    closeEditor();
    setLocalPreviewUrl(null);
    setCopyFeedback('idle');
    onChange({});
  }, [closeEditor, onChange]);

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

  const handleEditorSave = useCallback(
    (file: File) => {
      closeEditor();
      uploadFile(file);
    },
    [closeEditor, uploadFile],
  );

  const pickReplacementFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        handleIncomingFile(file);
      }
    };
    input.click();
  }, [handleIncomingFile]);

  const busy = isPending || isLoadingEditorSource;
  const zoneLegend = label ?? t('object_create_image_zone_title');
  const displayError = editorLoadError ?? uploadError;

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

      {editorSource && editorConfig ? (
        <ImageEditorPanel
          imageSrc={editorSource.objectUrl}
          config={editorConfig}
          onSave={handleEditorSave}
          onCancel={closeEditor}
          isSaving={busy}
        />
      ) : isLoadingEditorSource ? (
        <p className="text-body-sm text-muted" role="status">
          {t('image_editor_processing')}
        </p>
      ) : hasImage ? (
        <div className="space-y-3">
          <div
            className={[
              'overflow-hidden rounded-btn border border-border bg-ghost-surface',
              isSquarePreview ? 'mx-auto w-full max-w-xs' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {videoPreview && previewUrl ? (
              <div className="relative aspect-square w-full">
                <VideoPreviewPlayer
                  source={previewUrl}
                  variant="gallery"
                  previewOnly
                  className="size-full"
                />
              </div>
            ) : (
              <img
                src={previewUrl ?? ''}
                alt=""
                className={
                  isSquarePreview
                    ? 'aspect-square w-full object-cover'
                    : 'max-h-64 min-h-[14rem] w-full object-contain'
                }
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {editorConfig && !videoPreview ? (
              <button
                type="button"
                className={ACTION_LINK_CLASS}
                disabled={busy}
                onClick={() => {
                  if (previewUrl) {
                    void openEditorWithUrl(previewUrl);
                  }
                }}
              >
                {t('image_editor_adjust')}
              </button>
            ) : null}
            <button
              type="button"
              className={ACTION_LINK_CLASS}
              disabled={busy}
              onClick={pickReplacementFile}
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
        <IpfsImageDropZone
          onUploaded={onUploaded}
          onFilePicked={editorConfig ? handleIncomingFile : undefined}
          onUrlPicked={editorConfig ? handleIncomingUrl : undefined}
          disabled={busy}
          legend={zoneLegend}
          hideLegend
          onPointerEnter={markActive}
          onFocus={markActive}
        />
      )}

      {displayError ? (
        <p className="text-caption text-error" role="alert">
          {displayError}
        </p>
      ) : null}
    </fieldset>
  );
}
