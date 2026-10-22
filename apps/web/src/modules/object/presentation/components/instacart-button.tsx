'use client';

import { useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';

export type InstacartButtonVariant = 'card' | 'page';

export type InstacartButtonProps = {
  objectId: string;
  variant: InstacartButtonVariant;
  /** Center the page button + disclaimer (object hero). */
  align?: 'start' | 'center';
  disclaimerClassName?: string;
};

export function InstacartButton({
  objectId,
  variant,
  align = 'start',
  disclaimerClassName = 'text-caption text-fg-secondary',
}: InstacartButtonProps) {
  const { t } = useI18n();
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const label =
    variant === 'page'
      ? t('Instacart_Get_Recipe_Ingredients')
      : t('Instacart_Get_Ingredients');

  return (
    <div
      className={
        variant === 'page'
          ? align === 'center'
            ? 'flex flex-col items-center gap-2'
            : 'flex flex-col items-start gap-2'
          : 'mt-2'
      }
    >
      <button
        type="button"
        className={variant === 'page' ? 'instacart-btn instacart-btn--page' : 'instacart-btn'}
        disabled={pending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void openInstacartLink(objectId, {
            onPending: setPending,
            onError: () => setError(true),
            onSuccess: () => setError(false),
          });
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
        <img
          src="/images/affiliate/instacart-logo-carrot.svg"
          alt=""
          className="instacart-btn__carrot"
        />
        <span>{label}</span>
      </button>
      {variant === 'page' ? (
        <p className={disclaimerClassName}>{t('Instacart_Earns_Commissions')}</p>
      ) : null}
      {error ? (
        <p className="text-caption text-error" role="status">
          {t('Instacart_Link_Failed')}
        </p>
      ) : null}
    </div>
  );
}

export async function openInstacartLink(
  objectId: string,
  hooks: {
    onPending: (pending: boolean) => void;
    onError: () => void;
    onSuccess: () => void;
  },
): Promise<void> {
  const popup = window.open('about:blank');
  hooks.onPending(true);
  try {
    const response = await fetch(
      `/api/objects/${encodeURIComponent(objectId)}/instacart-link`,
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const body = (await response.json()) as { url?: unknown };
    if (typeof body.url !== 'string' || !body.url.trim()) {
      throw new Error('missing url');
    }
    if (popup) {
      popup.location.href = body.url;
    }
    hooks.onSuccess();
  } catch {
    popup?.close();
    hooks.onError();
  } finally {
    hooks.onPending(false);
  }
}
