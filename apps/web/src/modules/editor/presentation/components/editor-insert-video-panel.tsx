'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useId, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { parseMediaEmbedUrl } from '@/shared/infrastructure/media-embed';

import { insertMediaUrlAtSelection } from '../../application/insert-editor-media-url';

export type EditorInsertVideoPanelProps = {
  onInserted: () => void;
  restoreSelection?: () => void;
};

export function EditorInsertVideoPanel({
  onInserted,
  restoreSelection,
}: EditorInsertVideoPanelProps) {
  const [editor] = useLexicalComposerContext();
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [invalid, setInvalid] = useState(false);
  const inputId = useId();

  function submit(): void {
    const trimmed = url.trim();
    if (!parseMediaEmbedUrl(trimmed)) {
      setInvalid(true);
      return;
    }
    restoreSelection?.();
    insertMediaUrlAtSelection(editor, trimmed);
    onInserted();
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {t('editor_insert_video_placeholder')}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="url"
        autoComplete="off"
        autoFocus
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setInvalid(false);
        }}
        placeholder={t('editor_insert_video_placeholder')}
        className="h-10 w-full rounded-btn border border-border bg-bg px-3 text-body text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {invalid ? (
        <p className="text-caption text-error" role="alert">
          {t('editor_insert_video_invalid')}
        </p>
      ) : null}
      <button
        type="submit"
        className="h-10 rounded-btn bg-accent px-3 text-body-sm font-weight-label text-accent-fg hover:opacity-90"
      >
        {t('add')}
      </button>
    </form>
  );
}
