'use client';

import { useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { LexicalPostEditor } from './lexical-editor';

const POST_TITLE_MAX_LENGTH = 255;

export type EditorScreenProps = {
  username: string;
};

export function EditorScreen({ username }: EditorScreenProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');

  return (
    <main className="mx-auto max-w-container-content px-gutter py-section-y sm:px-gutter-sm">
      <header className="mb-6">
        <h1 className="font-display text-section text-heading leading-display">
          {t('editor')}
        </h1>
        <p className="mt-1 text-body-sm text-fg-secondary">
          @{username}
        </p>
      </header>

      <div className="flex w-full flex-col gap-4">
        <div>
          <label
            htmlFor="post-title"
            className="mb-1.5 block font-label text-caption text-fg-secondary tracking-caption"
          >
            {t('title')}
          </label>
          <input
            id="post-title"
            type="text"
            name="title"
            value={title}
            maxLength={POST_TITLE_MAX_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('title_placeholder')}
            className={[
              'w-full rounded-btn border border-border bg-surface-control px-3 py-2',
              'font-display text-body-lg text-fg placeholder:text-fg-tertiary',
              'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
            ].join(' ')}
            autoComplete="off"
          />
        </div>

        <LexicalPostEditor bodyPlaceholder={t('story_placeholder')} />
      </div>
    </main>
  );
}
