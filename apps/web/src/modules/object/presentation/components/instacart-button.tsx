'use client';

import { useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { instacartWaitPath } from '@/modules/object/domain/instacart-wait';

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
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const popup = window.open(instacartWaitPath(objectId));
          setError(!popup);
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
