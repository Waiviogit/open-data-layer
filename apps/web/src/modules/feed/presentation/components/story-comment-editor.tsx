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

function IconArrowUp({ className }: { className?: string }) {
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
      <path d="M12 19V5M5 12l7-7 7 7" />
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
      <LexicalPostEditor
        key={editorKey}
        compact
        bodyPlaceholder="Write your comment…"
        onPlainTextChange={setBodyPlain}
      />
      <div className="mt-2 flex items-center justify-end">
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={!canSubmit}
          aria-label="Submit comment"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-btn border border-border bg-accent text-accent-fg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconArrowUp />
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
