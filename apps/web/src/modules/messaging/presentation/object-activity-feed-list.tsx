'use client';

import { useMemo } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { sanitizePostBodyHtml } from '@/shared/infrastructure/post-body-html-pipeline';
import { SocialEmbedHtml } from '@/shared/presentation';
import { OptimisticNavLink } from '@/shared/presentation/navigation';

import {
  compareActivityMessagesDesc,
  groupMessagesByDay,
  isOutgoingMessage,
  messageActivitySortUnix,
  resolveMessagePresentation,
} from '../domain/messaging.helpers';
import type { MessageItem } from '../domain/messaging.types';
import { MessageRow } from './message-row';

export type ObjectActivityFeedListProps = {
  messages: MessageItem[];
  viewerUsername: string | null;
  loadingMore?: boolean;
  sentinelRef?: React.RefObject<HTMLDivElement | null>;
  onReply?: (message: MessageItem) => void;
  onEdit?: (message: MessageItem) => void;
  onDelete?: (message: MessageItem) => void | Promise<void>;
};

export function ObjectActivityFeedList({
  messages,
  viewerUsername,
  loadingMore = false,
  sentinelRef,
  onReply,
  onEdit,
  onDelete,
}: ObjectActivityFeedListProps) {
  const { t, locale } = useI18n();

  const messagesById = useMemo(
    () => new Map(messages.map((message) => [message.message_id, message])),
    [messages],
  );

  const sortedMessages = useMemo(
    () => [...messages].sort(compareActivityMessagesDesc),
    [messages],
  );

  const groups = useMemo(
    () =>
      groupMessagesByDay(
        sortedMessages,
        (unix) =>
          new Date(unix * 1000).toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        messageActivitySortUnix,
      ),
    [sortedMessages, locale],
  );

  if (messages.length === 0) {
    return (
      <p className="py-6 text-center text-body-sm text-muted">
        {t('object_activity_empty')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.dayKey}>
          <div className="mb-3 flex justify-center">
            <span className="rounded-full bg-surface-control px-3 py-1 text-caption text-muted">
              {group.label}
            </span>
          </div>
          <div className="space-y-3">
            {group.messages.map((message) => {
              const outgoing = isOutgoingMessage(message, viewerUsername);
              const presentation = resolveMessagePresentation(message, viewerUsername);

              let bodyNode: React.ReactNode;
              if (presentation.kind === 'plain' || presentation.kind === 'decrypted') {
                bodyNode = (
                  <SocialEmbedHtml
                    html={sanitizePostBodyHtml(presentation.text)}
                    className="blog-post-body break-words text-body-sm [&_a]:text-link [&_a]:underline"
                  />
                );
              } else {
                bodyNode = (
                  <p className="text-body-sm text-muted">
                    {t('object_activity_encrypted_unsupported')}
                  </p>
                );
              }

              return (
                <MessageRow
                  key={message.message_id}
                  message={message}
                  viewerUsername={viewerUsername}
                  messagesById={messagesById}
                  bodyNode={bodyNode}
                  activityCaption
                  authorNode={
                    !outgoing ? (
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
      {loadingMore ? (
        <p className="py-2 text-center text-caption text-muted">
          {t('messaging_loading_older')}
        </p>
      ) : null}
      <div ref={sentinelRef} aria-hidden className="h-px" />
    </div>
  );
}
