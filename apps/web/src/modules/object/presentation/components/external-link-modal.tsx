'use client';

import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { safeHttpUrl } from '@/shared/domain/safe-http-url';
import { ModalShell, ModalShellCloseButton, MODAL_Z_INDEX_ABOVE_MAP } from '@/shared/presentation';

export type ExternalLinkModalProps = {
  url: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ExternalLinkModal({ url, onClose, onConfirm }: ExternalLinkModalProps) {
  const { t } = useI18n();

  const header = (
    <div className="flex items-center justify-between gap-4 border-b border-border px-card-padding py-3">
      <h2
        id="external-link-dialog-title"
        className="min-w-0 flex-1 text-section font-display text-heading"
      >
        {t('external_link_modal_title')}
      </h2>
      <ModalShellCloseButton onClose={onClose} ariaLabel={t('cancel')} />
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-2 border-t border-border px-card-padding py-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-btn border border-border px-4 py-2 text-body-sm font-weight-label text-fg hover:bg-surface"
      >
        {t('cancel')}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="rounded-btn bg-accent px-4 py-2 text-body-sm font-weight-label text-accent-fg hover:opacity-90"
      >
        {t('confirm')}
      </button>
    </div>
  );

  return (
    <ModalShell
      open
      onClose={onClose}
      labelledBy="external-link-dialog-title"
      zIndex={MODAL_Z_INDEX_ABOVE_MAP}
      maxWidthClass="max-w-container-narrow"
      panelClassName="rounded-card-lg"
      header={header}
      footer={footer}
      scrollBody={false}
    >
      <div className="px-card-padding py-3">
        <p className="text-body-sm text-muted">{t('external_link_modal_body')}</p>
        <p className="mt-3 break-all font-weight-label text-accent">{url}</p>
      </div>
    </ModalShell>
  );
}

export type ExternalLinkButtonProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function ExternalLinkButton({ href, className, children }: ExternalLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const safeHref = safeHttpUrl(href);

  const handleConfirm = useCallback(() => {
    if (!safeHref) {
      return;
    }
    window.open(safeHref, '_blank', 'noopener,noreferrer');
    setOpen(false);
  }, [safeHref]);

  if (!safeHref) {
    return (
      <span className={className} aria-disabled="true">
        {children}
      </span>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open ? (
        <ExternalLinkModal
          url={safeHref}
          onClose={() => setOpen(false)}
          onConfirm={handleConfirm}
        />
      ) : null}
    </>
  );
}
