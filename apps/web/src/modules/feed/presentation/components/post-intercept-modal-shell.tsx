'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, type ReactNode } from 'react';

type PostInterceptModalShellProps = {
  children: ReactNode;
};

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconReblog() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function IconShareX() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconShareFacebook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function ActionPill({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-circle border border-border bg-surface text-fg-secondary shadow-card hover:bg-surface-control hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {children}
    </button>
  );
}

/**
 * Backdrop + centered panel for intercepting routes.
 * The action pills (close, share) float to the right of the card on desktop,
 * or appear inside the card header on mobile.
 */
export function PostInterceptModalShell({ children }: PostInterceptModalShellProps) {
  const router = useRouter();

  const onClose = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareX = `https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
  const shareFb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-overlay/70 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      {/*
        Outer: full-width flex column that simply fills min-h-full so the
        backdrop covers the whole viewport. py-8 gives top/bottom breathing room.
      */}
      <div className="flex min-h-full flex-col items-center justify-start px-4 py-8 sm:px-6">
        {/*
          Inner: card + pills sit side-by-side, centered as a unit.
          max-w caps the total width; on smaller screens the pills collapse.
        */}
        <div className="flex w-full max-w-container-post items-start gap-3">
          {/* Modal card */}
          <div
            role="dialog"
            aria-modal="true"
            className="min-w-0 flex-1 rounded-sm border-0 bg-surface shadow-card-float"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Mobile close bar */}
            <div className="flex items-center justify-end border-b border-border px-4 py-2 lg:hidden">
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-circle text-fg-secondary hover:text-fg"
              >
                <IconClose />
              </button>
            </div>

            <div className="px-6 py-5 sm:px-8 sm:py-6">{children}</div>
          </div>

          {/* Floating action pills — desktop only, right side of card */}
          <div
            className="hidden shrink-0 flex-col gap-2 pt-4 lg:flex"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <ActionPill label="Close" onClick={onClose}>
              <IconClose />
            </ActionPill>
            <ActionPill label="Reblog">
              <IconReblog />
            </ActionPill>
            <ActionPill label="Share on X" onClick={() => window.open(shareX, '_blank', 'noopener')}>
              <IconShareX />
            </ActionPill>
            <ActionPill label="Share on Facebook" onClick={() => window.open(shareFb, '_blank', 'noopener')}>
              <IconShareFacebook />
            </ActionPill>
          </div>
        </div>
      </div>
    </div>
  );
}
