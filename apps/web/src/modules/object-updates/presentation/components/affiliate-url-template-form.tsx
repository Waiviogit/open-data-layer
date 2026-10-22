'use client';

import { UPDATE_AFFILIATE_URL_TEMPLATE } from '@opden-data-layer/core/update-registry';

import { useI18n } from '@/i18n/providers/i18n-provider';

import { validateUpdateValue } from '../../application/update-value-form.utils';

export type AffiliateUrlTemplateFormProps = {
  value: unknown;
  onChange: (value: string) => void;
};

export function AffiliateUrlTemplateForm({
  value,
  onChange,
}: AffiliateUrlTemplateFormProps) {
  const { t } = useI18n();
  const text = typeof value === 'string' ? value : '';
  const valid = validateUpdateValue(UPDATE_AFFILIATE_URL_TEMPLATE, text).success;

  return (
    <label className="block text-body-sm">
      <input
        type="text"
        className="w-full rounded-btn border border-border bg-bg px-3 py-2 text-body-sm text-fg placeholder:text-muted"
        value={text}
        placeholder={t('object_field_affiliateUrlTemplate')}
        onChange={(e) => onChange(e.target.value)}
      />
      {!valid ? (
        <p className="mt-1 text-caption text-error" role="alert">
          {t('affiliate_url_error')}
        </p>
      ) : null}
      <p className="mt-1 text-caption text-muted">{t('affiliate_url_template_info')}</p>
    </label>
  );
}
