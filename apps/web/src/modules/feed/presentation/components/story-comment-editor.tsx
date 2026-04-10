'use client';

import { useCallback, useState } from 'react';

import { getHiveJsonMetadataDefaults } from '@/config/hive-json-metadata-public';
import { LexicalPostEditor } from '@/modules/editor';
import { buildCommentOp, getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { buildHiveJsonMetadataString, createCommentPermlink } from '@/shared';

import type { FeedStoryView } from '../../application/dto/feed-story.dto';

export type StoryCommentEditorProps = {
  story: FeedStoryView;
  currentUsername: string;
};

/** Matches insert (+) control styling in `EditorInsertCaretOverlay` — soft circular control. */
function IconSendChevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function StoryCommentEditor({ story, currentUsername }: StoryCommentEditorProps) {
  useHydrateWalletProvider();
  const [bodyPlain, setBodyPlain] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const onSubmit = useCallback(async () => {
    const body = bodyPlain.trim();
    if (!body || pending) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const defaults = getHiveJsonMetadataDefaults();
      const json_metadata = buildHiveJsonMetadataString({
        host: window.location.host,
        ...defaults,
      });
      const op = buildCommentOp({
        parent_author: story.authorName,
        parent_permlink: story.permlink,
        author: currentUsername,
        permlink: createCommentPermlink(story.authorName, story.permlink),
        title: '',
        body,
        json_metadata,
      });
      await getWalletFacade().broadcast({ operations: [op] });
      setBodyPlain('');
      setEditorKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comment failed');
    } finally {
      setPending(false);
    }
  }, [bodyPlain, currentUsername, pending, story.authorName, story.permlink]);

  const canSubmit = bodyPlain.trim().length > 0 && !pending;

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="relative">
        <LexicalPostEditor
          key={editorKey}
          compact
          compactBottomInset
          bodyPlaceholder="Write your comment…"
          onPlainTextChange={setBodyPlain}
        />
        <div className="pointer-events-none absolute end-2 top-1/2 z-[65] -translate-y-1/2">
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={!canSubmit}
            aria-label="Submit comment"
            className={[
              'pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-circle border border-border',
              'bg-bg text-fg-secondary shadow-none',
              'hover:bg-ghost-surface',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              'disabled:cursor-not-allowed disabled:opacity-50',
            ].join(' ')}
          >
            <IconSendChevron />
          </button>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
