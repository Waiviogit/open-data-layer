'use client';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { CloseIcon } from '@/icons';

import { buildReplyQuoteJson, messageDisplayBody } from '../domain/messaging.helpers';
import type { MessagingComposeIntent } from '../domain/messaging.types';

export type MessagingComposeIntentStripProps = {
  intent: MessagingComposeIntent;
  onDismiss: () => void;
};

export function MessagingComposeIntentStrip({
  intent,
  onDismiss,
}: MessagingComposeIntentStripProps) {
  const { t } = useI18n();

  if (!intent) {
    return null;
  }

  if (intent.mode === 'edit') {
    return (
      <div className="mb-2 flex items-center justify-between gap-2 rounded-btn border border-border bg-surface-muted px-3 py-2 text-body-sm">
        <span className="text-muted">{t('messaging_action_edit')}</span>
        <button
          type="button"
          className="text-fg-secondary hover:text-fg"
          aria-label={t('close')}
          onClick={onDismiss}
        >
          <CloseIcon size={16} />
        </button>
      </div>
    );
  }

  const snippet = buildReplyQuoteJson(intent.message).body || messageDisplayBody(intent.message);
  const label = t('messaging_replying_to')
    .replace('{author}', intent.message.author)
    .replace('{snippet}', snippet);

  return (
    <div className="mb-2 flex items-start justify-between gap-2 rounded-btn border border-border bg-surface-muted px-3 py-2 text-body-sm">
      <span className="min-w-0 truncate text-muted">{label}</span>
      <button
        type="button"
        className="shrink-0 text-fg-secondary hover:text-fg"
        aria-label={t('close')}
        onClick={onDismiss}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
