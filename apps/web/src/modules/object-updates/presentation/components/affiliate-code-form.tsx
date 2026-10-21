'use client';

import { type CSSProperties } from 'react';

import {
  AFFILIATE_CODE_SCOPES,
  type AffiliateCodeScope,
} from '@opden-data-layer/core/constants';

import { PlusIcon, TrashIcon } from '@/icons';
import { useI18n } from '@/i18n/providers/i18n-provider';

import {
  addAffiliateCodeEntry,
  AFFILIATE_CODE_CHANCE_TOTAL,
  AFFILIATE_CODE_MAX_ENTRIES,
  applyAffiliateCodeChance,
  parseAffiliateCodeFormValue,
  removeAffiliateCodeEntry,
  type AffiliateCodeFormValue,
} from '../../application/affiliate-code-form-value';

export type AffiliateCodeFormProps = {
  value: unknown;
  onChange: (value: AffiliateCodeFormValue) => void;
};

export function AffiliateCodeForm({ value, onChange }: AffiliateCodeFormProps) {
  const { t } = useI18n();
  const parsed = parseAffiliateCodeFormValue(value);
  const { scope, entries } = parsed;
  const canAdd = entries.length < AFFILIATE_CODE_MAX_ENTRIES;
  const canRemove = entries.length > 1;

  function patch(next: AffiliateCodeFormValue) {
    onChange(next);
  }

  return (
    <fieldset className="space-y-3 text-body-sm">
      <legend className="sr-only">{t('object_field_affiliateCode')}</legend>
      <label className="block">
        <span className="text-muted">{t('object_edit_affiliate_context')}</span>
        <select
          className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={scope}
          onChange={(e) =>
            patch({ scope: e.target.value as AffiliateCodeScope, entries })
          }
        >
          {AFFILIATE_CODE_SCOPES.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
      {entries.map((entry, index) => {
        const sliderDisabled = entries.length === 1;
        return (
          <div key={index} className="space-y-2">
            <label className="block">
              <span className="flex items-center justify-between gap-2 text-muted">
                <span>
                  {t('object_field_affiliateCode')} {index + 1}
                </span>
                {canRemove ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-caption text-link hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    onClick={() =>
                      patch({
                        scope,
                        entries: removeAffiliateCodeEntry(entries, index),
                      })
                    }
                  >
                    <TrashIcon size="xs" strokeWidth={1.75} />
                    {t('object_edit_affiliate_remove')}
                  </button>
                ) : null}
              </span>
              <input
                type="text"
                className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
                value={entry.code}
                onChange={(e) => {
                  const next = entries.map((row, i) =>
                    i === index ? { ...row, code: e.target.value } : row,
                  );
                  patch({ scope, entries: next });
                }}
              />
            </label>
            <label className="block">
              <span className="text-muted">
                {t('object_edit_affiliate_frequency')} {entry.chance}%
              </span>
              <input
                type="range"
                className="gallery-rank-slider mt-2"
                min={0}
                max={AFFILIATE_CODE_CHANCE_TOTAL}
                step={1}
                disabled={sliderDisabled}
                value={entry.chance}
                aria-valuemin={0}
                aria-valuemax={AFFILIATE_CODE_CHANCE_TOTAL}
                aria-valuenow={entry.chance}
                style={
                  {
                    '--slider-fill': `${entry.chance}%`,
                  } as CSSProperties
                }
                onChange={(e) =>
                  patch({
                    scope,
                    entries: applyAffiliateCodeChance(
                      entries,
                      index,
                      Number(e.target.value),
                    ),
                  })
                }
              />
            </label>
          </div>
        );
      })}
      {canAdd ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 text-body-sm text-link hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          onClick={() =>
            patch({ scope, entries: addAffiliateCodeEntry(entries) })
          }
        >
          <span className="inline-flex size-7 items-center justify-center rounded-pill bg-accent text-accent-fg">
            <PlusIcon size="xs" strokeWidth={1.75} />
          </span>
          <span className="font-weight-label">{t('object_edit_affiliate_add')}</span>
        </button>
      ) : null}
    </fieldset>
  );
}
