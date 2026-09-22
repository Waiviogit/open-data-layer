'use client';

import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { getWalletFacade, useHydrateWalletProvider, useLoginModal } from '@/modules/auth';
import { AppModal, AppModalCloseButton } from '@/shared/presentation';
import { sanitizePostBodyHtml } from '@/shared/infrastructure/post-body-html-pipeline';
import { OptimisticNavLink } from '@/shared/presentation/navigation';

import { useDecryptMessage } from '../application/use-decrypt-message';
import {
  groupMessagesByDay,
  isOutgoingMessage,
  resolveMessagePresentation,
} from '../domain/messaging.helpers';
import type { MessageItem } from '../domain/messaging.types';
import { LockIcon } from '@/icons';
import { MessageRow } from './message-row';

export type MessagingMessageListProps = {
  messages: MessageItem[];
  viewerUsername: string | null;
  showAuthorNames?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  topSentinelRef?: React.RefObject<HTMLDivElement | null>;
  loadingOlder?: boolean;
  onReply?: (message: MessageItem) => void;
  onEdit?: (message: MessageItem) => void;
  onDelete?: (message: MessageItem) => void | Promise<void>;
};

export function MessagingMessageList({
  messages,
  viewerUsername,
  showAuthorNames = false,
  scrollContainerRef,
  topSentinelRef,
  loadingOlder = false,
  onReply,
  onEdit,
  onDelete,
}: MessagingMessageListProps) {
  const { t, locale } = useI18n();
  useHydrateWalletProvider();
  const { openLogin } = useLoginModal();
  const { decryptMessage, getDecryptedText } = useDecryptMessage(viewerUsername);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [keychainGateOpen, setKeychainGateOpen] = useState(false);
  const [decryptPendingId, setDecryptPendingId] = useState<string | null>(null);
  const [decryptBlockedByProvider, setDecryptBlockedByProvider] = useState(false);

  const chronological = useMemo(
    () => [...messages].sort((a, b) => a.created_at_unix - b.created_at_unix),
    [messages],
  );

  const groups = useMemo(
    () =>
      groupMessagesByDay(chronological, (unix) =>
        new Date(unix * 1000).toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      ),
    [chronological, locale],
  );

  const messagesById = useMemo(
    () => new Map(chronological.map((message) => [message.message_id, message])),
    [chronological],
  );

  const handleEncryptedClick = useCallback(
    async (message: MessageItem) => {
      setDecryptError(null);
      setDecryptPendingId(message.message_id);
      try {
        const result = await decryptMessage(message);
        if (!result.ok) {
          if (result.error === 'requires_keychain') {
            const provider = getWalletFacade().getActiveProvider();
            setDecryptBlockedByProvider(
              provider === 'hivesigner' || provider === 'hiveauth',
            );
            setKeychainGateOpen(true);
            return;
          }
          if (result.error === 'not_for_you') {
            setDecryptError(t('messaging_decrypt_not_for_you'));
            return;
          }
          setDecryptError(t('messaging_decrypt_failed'));
        }
      } finally {
        setDecryptPendingId(null);
      }
    },
    [decryptMessage, t],
  );

  return (
    <>
      <div
        ref={scrollContainerRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3"
      >
        {topSentinelRef ? <div ref={topSentinelRef} aria-hidden className="h-px w-full" /> : null}
        {loadingOlder ? (
          <p className="py-2 text-center text-caption text-muted">{t('messaging_loading_older')}</p>
        ) : null}
        {decryptError ? (
          <p className="mb-2 text-center text-body-sm text-danger">{decryptError}</p>
        ) : null}
        {groups.map((group) => (
          <div key={group.dayKey} className="mb-4">
            <div className="mb-3 flex justify-center">
              <span className="rounded-full bg-surface-control px-3 py-1 text-caption text-muted">
                {group.label}
              </span>
            </div>
            <div className="space-y-2">
              {group.messages.map((message) => {
                const outgoing = isOutgoingMessage(message, viewerUsername);
                const decryptedText = getDecryptedText(message.message_id);
                const presentation = resolveMessagePresentation(
                  message,
                  viewerUsername,
                  decryptedText,
                );

                let bodyNode: React.ReactNode;
                if (presentation.kind === 'plain' || presentation.kind === 'decrypted') {
                  bodyNode = (
                    <div
                      className="blog-post-body break-words text-body-sm [&_a]:text-link [&_a]:underline"
                      dangerouslySetInnerHTML={{
                        __html: sanitizePostBodyHtml(presentation.text),
                      }}
                    />
                  );
                } else if (presentation.kind === 'one-way') {
                  bodyNode = (
                    <p className="flex items-center gap-2 text-body-sm text-muted">
                      <LockIcon className="size-4 shrink-0" />
                      {t('messaging_message_one_way').replace('{to}', presentation.to)}
                    </p>
                  );
                } else {
                  bodyNode = (
                    <button
                      type="button"
                      disabled={decryptPendingId === message.message_id}
                      onClick={() => void handleEncryptedClick(message)}
                      className="flex w-full items-center gap-2 text-left text-body-sm text-muted hover:text-fg disabled:opacity-50"
                    >
                      <LockIcon className="size-4 shrink-0" />
                      {t('messaging_message_encrypted')}
                    </button>
                  );
                }

                return (
                  <MessageRow
                    key={message.message_id}
                    message={message}
                    viewerUsername={viewerUsername}
                    messagesById={messagesById}
                    bodyNode={bodyNode}
                    authorNode={
                      !outgoing && showAuthorNames ? (
                        <p className="mb-1 text-caption font-weight-label">
                          <OptimisticNavLink
                            href={`/@${encodeURIComponent(message.author)}`}
                            className="text-accent hover:underline"
                          >
                            {message.author}
                          </OptimisticNavLink>
                        </p>
                      ) : undefined
                    }
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <AppModal
        open={keychainGateOpen}
        onClose={() => {
          setKeychainGateOpen(false);
          setDecryptBlockedByProvider(false);
        }}
        panelClassName="p-4"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-section font-weight-strong text-fg">
            {decryptBlockedByProvider
              ? t('messaging_decrypt_requires_keychain_login')
              : t('messaging_decrypt_requires_keychain')}
          </h2>
          <AppModalCloseButton
            onClose={() => {
              setKeychainGateOpen(false);
              setDecryptBlockedByProvider(false);
            }}
            ariaLabel={t('close')}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-btn border border-border px-3 py-2 text-body-sm"
            onClick={() => {
              setKeychainGateOpen(false);
              setDecryptBlockedByProvider(false);
            }}
          >
            {t('cancel')}
          </button>
          {!decryptBlockedByProvider ? (
            <button
              type="button"
              className="rounded-btn bg-accent px-3 py-2 text-body-sm font-weight-label text-accent-fg"
              onClick={() => {
                setKeychainGateOpen(false);
                setDecryptBlockedByProvider(false);
                openLogin();
              }}
            >
              {t('messaging_login_required')}
            </button>
          ) : null}
        </div>
      </AppModal>
    </>
  );
}
