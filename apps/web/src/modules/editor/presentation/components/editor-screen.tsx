'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

import {
  createUserDraftAction,
  patchUserDraftAction,
} from '../../infrastructure/drafts.actions';
import { LexicalPostEditor } from './lexical-editor';
import {
  LastDraftsSidebar,
  type LastDraftSidebarItem,
} from './last-drafts-sidebar';

const POST_TITLE_MAX_LENGTH = 255;
const AUTOSAVE_DEBOUNCE_MS = 3000;

export type EditorScreenProps = {
  username: string;
  initialTitle?: string;
  initialBody?: string;
  /** Resolved draft id when loading by permlink/draftId on the server. */
  initialDraftId?: string | null;
  sidebarDrafts: LastDraftSidebarItem[];
};

export function EditorScreen({
  username,
  initialTitle = '',
  initialBody = '',
  initialDraftId = null,
  sidebarDrafts,
}: EditorScreenProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [bodyPlain, setBodyPlain] = useState(initialBody);
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedRef = useRef({
    title: initialTitle,
    body: initialBody,
    draftId: initialDraftId,
  });
  const stateRef = useRef({
    title,
    bodyPlain,
    draftId,
  });
  useEffect(() => {
    stateRef.current = { title, bodyPlain, draftId };
  }, [title, bodyPlain, draftId]);

  const runSave = useCallback(async () => {
    const { title: t0, bodyPlain: b0, draftId: id0 } = stateRef.current;
    const last = lastPersistedRef.current;
    if (
      t0 === last.title &&
      b0 === last.body &&
      id0 === last.draftId &&
      id0 !== null
    ) {
      return;
    }
    if (!id0 && !t0.trim() && !b0.trim()) {
      return;
    }
    if (!id0) {
      const r = await createUserDraftAction(username, {
        title: t0,
        body: b0,
      });
      if (r.ok) {
        const newId = r.value.draftId;
        setDraftId(newId);
        lastPersistedRef.current = {
          title: t0,
          body: b0,
          draftId: newId,
        };
        router.replace(`/editor?draftId=${encodeURIComponent(newId)}`);
        router.refresh();
      }
      return;
    }
    const r = await patchUserDraftAction(
      username,
      { draftId: id0 },
      { title: t0, body: b0 },
    );
    if (r.ok) {
      lastPersistedRef.current = {
        title: t0,
        body: b0,
        draftId: id0,
      };
      router.refresh();
    }
  }, [username, router]);

  const runSaveRef = useRef(runSave);
  useEffect(() => {
    runSaveRef.current = runSave;
  }, [runSave]);

  const scheduleSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runSaveRef.current();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const flush = () => {
      void runSaveRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      flush();
    };
  }, []);

  return (
    <main className="w-full min-w-0">
      <div
        className={[
          'grid w-full grid-cols-1 items-start gap-y-6',
          'lg:grid-cols-[minmax(0,1fr)_minmax(0,var(--shell-right-width))]',
          'lg:gap-x-card-padding',
        ].join(' ')}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <input
              id="post-title"
              type="text"
              name="title"
              value={title}
              maxLength={POST_TITLE_MAX_LENGTH}
              onChange={(e) => {
                setTitle(e.target.value);
                scheduleSave();
              }}
              placeholder={t('title_placeholder')}
              className={[
                'w-full rounded-btn border border-border bg-surface-control px-3 py-2',
                'font-display text-body-lg text-fg placeholder:text-fg-tertiary',
                'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              ].join(' ')}
              autoComplete="off"
            />
          </div>

          <LexicalPostEditor
            bodyPlaceholder={t('story_placeholder')}
            initialPlainText={initialBody || undefined}
            onPlainTextChange={(text) => {
              setBodyPlain(text);
              scheduleSave();
            }}
          />
        </div>

        <div className="min-w-0 self-start">
          <LastDraftsSidebar drafts={sidebarDrafts} />
        </div>
      </div>
    </main>
  );
}
