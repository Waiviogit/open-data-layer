'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import Image from 'next/image';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { MoreHorizontalIcon, ReplyIcon } from '@/icons';
import {
  getImagePathPost,
  shouldUnoptimizeRemoteImage,
} from '@/shared/presentation';
import { OptimisticNavLink } from '@/shared/presentation/navigation/optimistic-nav-link';
import { useMediaQuery } from '@/shared/presentation/layout/hooks/use-breakpoint';

import {
  formatActivityMessageCaption,
  formatMessageTimeCaption,
  isOutgoingMessage,
  messageCopyText,
  resolveMessageQuotePreview,
} from '../domain/messaging.helpers';
import { resolveMessageActions } from '../domain/resolve-message-actions';
import type { MessageItem } from '../domain/messaging.types';
import { DeleteMessageModal } from './delete-message-modal';
import { MessageActionsMenu } from './message-actions-menu';
import { MessageActionsSheet } from './message-actions-sheet';

const LONG_PRESS_MS = 500;

export type MessageRowProps = {
  message: MessageItem;
  viewerUsername: string | null;
  messagesById: ReadonlyMap<string, MessageItem>;
  bodyNode: ReactNode;
  authorNode?: ReactNode;
  /** Activity feed: show original-date caption when stamped. */
  activityCaption?: boolean;
  onReply?: (message: MessageItem) => void;
  onEdit?: (message: MessageItem) => void;
  onDelete?: (message: MessageItem) => void | Promise<void>;
};

export function MessageRow({
  message,
  viewerUsername,
  messagesById,
  bodyNode,
  authorNode,
  activityCaption = false,
  onReply,
  onEdit,
  onDelete,
}: MessageRowProps) {
  const { t, locale } = useI18n();
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const finePointer = useMediaQuery('(pointer: fine)');
  const canHover = useMediaQuery('(hover: hover)');
  const showDesktopChrome = canHover && finePointer && !coarsePointer;
  const outgoing = isOutgoingMessage(message, viewerUsername);
  const actions = resolveMessageActions(message, viewerUsername);
  const hasAnyAction = actions.edit || actions.delete || actions.copy || actions.reply;

  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressMovedRef = useRef(false);

  const quote = resolveMessageQuotePreview(message, messagesById);
  const quoteImageDisplayUrl = useMemo(
    () => (quote?.imageUrl ? getImagePathPost(quote.imageUrl) : null),
    [quote?.imageUrl],
  );
  const editedLabel = t('messaging_edited');

  const timeCaption = activityCaption
    ? formatActivityMessageCaption(
        message,
        locale,
        t('object_activity_original_date_caption'),
        editedLabel,
      )
    : formatMessageTimeCaption(
        message.created_at_unix,
        locale,
        message.updated_at_unix,
        editedLabel,
      );

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }
    const onDoc = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const handleCopy = useCallback(async () => {
    const text = messageCopyText(message);
    if (text == null) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setMenuOpen(false);
    setSheetOpen(false);
  }, [message]);

  const handleReply = useCallback(() => {
    setMenuOpen(false);
    setSheetOpen(false);
    onReply?.(message);
  }, [message, onReply]);

  const handleEdit = useCallback(() => {
    setMenuOpen(false);
    setSheetOpen(false);
    onEdit?.(message);
  }, [message, onEdit]);

  const handleDeleteRequest = useCallback(() => {
    setMenuOpen(false);
    setSheetOpen(false);
    setDeleteOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!onDelete) {
      return;
    }
    setDeletePending(true);
    try {
      await onDelete(message);
      setDeleteOpen(false);
    } finally {
      setDeletePending(false);
    }
  }, [message, onDelete]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!coarsePointer || !hasAnyAction) {
        return;
      }
      if (event.pointerType !== 'touch') {
        return;
      }
      longPressMovedRef.current = false;
      clearLongPress();
      longPressTimerRef.current = setTimeout(() => {
        setSheetOpen(true);
      }, LONG_PRESS_MS);
    },
    [clearLongPress, coarsePointer, hasAnyAction],
  );

  const onPointerMove = useCallback(() => {
    if (coarsePointer) {
      longPressMovedRef.current = true;
      clearLongPress();
    }
  }, [clearLongPress, coarsePointer]);

  const onPointerUp = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const bubbleClass = [
    'max-w-[min(100%,28rem)] rounded-card px-3 py-2',
    outgoing ? 'bg-accent-soft text-fg' : 'border border-border bg-surface text-fg',
  ].join(' ');

  const actionHandlers = {
    onReply: onReply ? handleReply : undefined,
    onCopy: actions.copy ? handleCopy : undefined,
    onEdit: onEdit ? handleEdit : undefined,
    onDelete: onDelete ? handleDeleteRequest : undefined,
  };

  const desktopActions =
    showDesktopChrome && hasAnyAction ? (
      <div
        ref={menuRef}
        className="flex shrink-0 items-start gap-0.5 pt-1 opacity-0 transition-opacity group-hover/message:opacity-100"
      >
        {actions.reply && onReply ? (
          <button
            type="button"
            className="rounded-btn p-1 text-fg-secondary hover:bg-surface-muted hover:text-fg"
            aria-label={t('messaging_action_reply')}
            onClick={handleReply}
          >
            <ReplyIcon size={18} />
          </button>
        ) : null}
        <div className="relative">
          <button
            type="button"
            className="rounded-btn p-1 text-fg-secondary hover:bg-surface-muted hover:text-fg"
            aria-label={t('messaging_action_more_aria')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontalIcon size={18} />
          </button>
          {menuOpen ? (
            <div
              className={[
                'absolute bottom-full z-[80] mb-1',
                outgoing ? 'end-0' : 'start-0',
              ].join(' ')}
            >
              <MessageActionsMenu actions={actions} {...actionHandlers} />
            </div>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <>
      <div
        className={[
          'group/message flex items-start gap-1.5',
          outgoing ? 'justify-end' : 'justify-start',
        ].join(' ')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {outgoing ? desktopActions : null}

        <div className={bubbleClass}>
          {authorNode}
          {message.source_object ? (
            <p className="mb-1 text-caption">
              <OptimisticNavLink
                href={`/object/${encodeURIComponent(message.source_object.object_id)}/reviews/activity`}
                className="text-link hover:underline"
              >
                {t('object_activity_source_from').replace(
                  '{name}',
                  message.source_object.name,
                )}
              </OptimisticNavLink>
            </p>
          ) : null}
          {quote ? (
            <div
              className={[
                'mb-2 border-s-2 ps-2 text-caption',
                quote.deleted ? 'border-border text-muted' : 'border-accent text-muted',
              ].join(' ')}
            >
              {quote.deleted ? (
                <span>{t('messaging_reply_deleted')}</span>
              ) : quoteImageDisplayUrl ? (
                <div className="flex items-start gap-2">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-btn bg-surface-control">
                    <Image
                      src={quoteImageDisplayUrl}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized={shouldUnoptimizeRemoteImage(quoteImageDisplayUrl)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-weight-label text-fg-secondary">{quote.author}</span>
                    {quote.body.trim().length > 0 ? (
                      <p className="line-clamp-2 break-words">{quote.body}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  <span className="font-weight-label text-fg-secondary">{quote.author}</span>
                  <p className="line-clamp-2 break-words">{quote.body}</p>
                </>
              )}
            </div>
          ) : null}
          {bodyNode}
          <p className="mt-1 text-caption text-muted">{timeCaption}</p>
          {activityCaption && (message.duplicate_count ?? 1) > 1 ? (
            <p className="mt-0.5 text-caption text-muted">
              {t('object_activity_duplicate_badge').replace(
                '{count}',
                String((message.duplicate_count ?? 1) - 1),
              )}
            </p>
          ) : null}
        </div>

        {!outgoing ? desktopActions : null}
      </div>

      <MessageActionsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        actions={actions}
        {...actionHandlers}
      />

      <DeleteMessageModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        pending={deletePending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
