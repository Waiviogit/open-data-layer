'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { fetchUserSearchResults } from '@/modules/app-header/infrastructure/search.client';
import { AppModal, AppModalCloseButton, UserAvatar } from '@/shared/presentation';

import { hiveAvatarUrl } from '../domain/messaging.helpers';

export type NewMessageStartChatInput = {
  peers: string[];
  title?: string;
  /** Search `profile_image` for a single peer. Already resolved; not a new lookup. */
  peerAvatarUrl?: string | null;
};

export type NewMessageModalProps = {
  open: boolean;
  onClose: () => void;
  viewerUsername?: string | null;
  onStartChat: (input: NewMessageStartChatInput) => void | Promise<void>;
  pending?: boolean;
};

type SearchHit = {
  name: string;
  profile_image: string | null;
};

export function NewMessageModal({
  open,
  onClose,
  viewerUsername = null,
  onStartChat,
  pending = false,
}: NewMessageModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searchPending, setSearchPending] = useState(false);
  const [selected, setSelected] = useState<SearchHit[]>([]);
  const [groupTitle, setGroupTitle] = useState('');

  const viewer = viewerUsername?.trim().toLowerCase() ?? null;

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected([]);
      setGroupTitle('');
    }
  }, [open]);

  const search = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    setSearchPending(true);
    try {
      const hits = await fetchUserSearchResults(trimmed);
      setResults(
        (hits ?? []).map((hit) => ({
          name: hit.name,
          profile_image: hit.profile_image,
        })),
      );
    } finally {
      setSearchPending(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handle = window.setTimeout(() => {
      void search(query);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, query, search]);

  const selectedNames = useMemo(
    () => new Set(selected.map((hit) => hit.name.toLowerCase())),
    [selected],
  );

  const addUser = useCallback(
    (hit: SearchHit) => {
      if (viewer && hit.name.toLowerCase() === viewer) {
        return;
      }
      if (selectedNames.has(hit.name.toLowerCase())) {
        return;
      }
      setSelected((prev) => [...prev, hit]);
      setQuery('');
      setResults([]);
    },
    [selectedNames, viewer],
  );

  const removeUser = useCallback((name: string) => {
    const needle = name.toLowerCase();
    setSelected((prev) => prev.filter((hit) => hit.name.toLowerCase() !== needle));
  }, []);

  const canStart = selected.length > 0 && !pending;

  const startChat = useCallback(async () => {
    if (!canStart) {
      return;
    }
    const peers = selected.map((hit) => hit.name);
    const title = groupTitle.trim();
    await onStartChat({
      peers,
      title: peers.length >= 2 && title.length > 0 ? title : undefined,
      peerAvatarUrl: peers.length === 1 ? (selected[0]?.profile_image ?? null) : undefined,
    });
  }, [canStart, groupTitle, onStartChat, selected]);

  return (
    <AppModal open={open} onClose={onClose} labelledBy={titleId} panelClassName="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-body-lg font-weight-strong text-fg">
          {t('messaging_new_message')}
        </h2>
        <AppModalCloseButton onClose={onClose} ariaLabel={t('close')} />
      </div>
      {selected.length > 0 ? (
        <div className="mt-4">
          <p className="text-caption text-muted">{t('messaging_selected_users')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {selected.map((hit) => (
              <li key={hit.name}>
                <span className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface-control px-2 py-1">
                  <UserAvatar
                    username={hit.name}
                    avatarUrl={hit.profile_image ?? hiveAvatarUrl(hit.name)}
                    displayName={hit.name}
                    size={24}
                  />
                  <span className="text-body-sm text-fg">{hit.name}</span>
                  <button
                    type="button"
                    className="text-caption text-muted hover:text-fg"
                    aria-label={t('messaging_remove_selected_user').replace('{name}', hit.name)}
                    onClick={() => removeUser(hit.name)}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {selected.length >= 2 ? (
        <label className="mt-4 block">
          <span className="text-body-sm text-muted">{t('messaging_group_title')}</span>
          <input
            type="text"
            value={groupTitle}
            onChange={(event) => setGroupTitle(event.target.value)}
            placeholder={t('messaging_group_title_placeholder')}
            className="mt-1 w-full rounded-btn border border-border bg-surface px-3 py-2 text-body-sm"
          />
        </label>
      ) : null}
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('messaging_search_user')}
        className="mt-4 w-full rounded-btn border border-border bg-surface px-3 py-2 text-body-sm"
        autoFocus={open}
      />
      <ul className="mt-3 max-h-64 overflow-y-auto">
        {searchPending ? (
          <li className="px-2 py-3 text-body-sm text-muted">{t('app_header_search_loading')}</li>
        ) : null}
        {!searchPending && results.length === 0 && query.trim().length >= 2 ? (
          <li className="px-2 py-3 text-body-sm text-muted">{t('search_empty_state')}</li>
        ) : null}
        {results.map((hit) => {
          const isSelected = selectedNames.has(hit.name.toLowerCase());
          const isViewer = viewer != null && hit.name.toLowerCase() === viewer;
          return (
            <li key={hit.name}>
              <button
                type="button"
                disabled={isSelected || isViewer}
                className="flex w-full items-center gap-3 rounded-btn px-2 py-2 text-left hover:bg-surface-control/60 disabled:opacity-50"
                onClick={() => addUser(hit)}
              >
                <UserAvatar
                  username={hit.name}
                  avatarUrl={hit.profile_image ?? hiveAvatarUrl(hit.name)}
                  displayName={hit.name}
                  size={36}
                />
                <span className="truncate text-body-sm text-fg">{hit.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!canStart}
          className="rounded-btn bg-accent px-4 py-2 text-body-sm font-weight-label text-accent-fg disabled:opacity-50"
          onClick={() => {
            void startChat();
          }}
        >
          {t('messaging_start_chat')}
        </button>
      </div>
    </AppModal>
  );
}
