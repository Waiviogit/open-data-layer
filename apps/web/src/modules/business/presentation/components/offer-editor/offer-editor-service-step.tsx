'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { OBL_CATALOG_OBJECT_TYPES } from '../../../domain/obl-catalog-types';
import { buildDiscoverHref } from '@/modules/discover/domain/discover-url';
import { fetchDiscoverObjects } from '@/modules/discover/infrastructure/discover.client';
import type { SocialProjectedObjectView } from '@/modules/user-social/application/dto/user-social.dto';

import {
  getOfferTerms,
  patchOfferTerms,
  type OfferDraftFields,
  type OfferSignParam,
} from '../../../domain/offer-form.types';
import { OfferEditorObjectRefField } from './offer-editor-object-ref-field';
import { offerEditorFieldClass, offerEditorLabelClass } from './offer-editor-field-styles';

function serviceObjectLabel(item: SocialProjectedObjectView): string {
  const name = item.fields['name'];
  if (typeof name === 'string' && name.trim().length > 0) {
    return name.trim();
  }
  const title = item.fields['title'];
  if (typeof title === 'string' && title.trim().length > 0) {
    return title.trim();
  }
  return item.object_id;
}

function emptySignParam(): OfferSignParam {
  return { key: '', label: '', required: false };
}

export type OfferEditorServiceStepProps = {
  username: string;
  kind: 'offer' | 'request';
  fields: OfferDraftFields;
  onFieldsChange: (fields: OfferDraftFields) => void;
};

export function OfferEditorServiceStep({
  username,
  kind,
  fields,
  onFieldsChange,
}: OfferEditorServiceStepProps) {
  const { t } = useI18n();
  const objectType =
    kind === 'offer'
      ? OBL_CATALOG_OBJECT_TYPES.SERVICE_OFFER
      : OBL_CATALOG_OBJECT_TYPES.SERVICE_REQUEST;
  const [suggestions, setSuggestions] = useState<SocialProjectedObjectView[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const signParams = getOfferTerms(fields).signParams ?? [];

  useEffect(() => {
    const controller = new AbortController();
    void fetchDiscoverObjects({
      objectType,
      limit: 12,
      signal: controller.signal,
    }).then((page) => {
      if (!controller.signal.aborted) {
        setSuggestions(page?.items ?? []);
        setLoadingSuggestions(false);
      }
    });
    return () => controller.abort();
  }, [objectType]);

  function updateSignParams(next: OfferSignParam[]) {
    onFieldsChange(patchOfferTerms(fields, { signParams: next }));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-fg-secondary">{t('business_field_service_ref_hint')}</p>

      <OfferEditorObjectRefField
        username={username}
        label={t('business_field_service_ref')}
        value={fields.serviceRef ?? ''}
        onChange={(objectId) => onFieldsChange({ ...fields, serviceRef: objectId })}
        objectType={objectType}
      />

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-body-sm font-weight-label text-heading">
            {t('business_service_suggestions_title')}
          </p>
          <Link
            href={buildDiscoverHref({ type: objectType })}
            className="text-body-sm text-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('business_browse_services')}
          </Link>
        </div>
        {loadingSuggestions ? (
          <p className="text-caption text-fg-secondary">{t('business_loading')}</p>
        ) : suggestions.length === 0 ? (
          <p className="text-body-sm text-fg-secondary">{t('business_service_suggestions_empty')}</p>
        ) : (
          <ul className="flex flex-col gap-1 rounded-card border border-border bg-surface-alt p-2">
            {suggestions.map((item) => {
              const selected = fields.serviceRef === item.object_id;
              return (
                <li key={item.object_id}>
                  <button
                    type="button"
                    onClick={() => onFieldsChange({ ...fields, serviceRef: item.object_id })}
                    className={[
                      'flex w-full items-center justify-between gap-2 rounded-btn px-2 py-2 text-start text-body-sm',
                      selected
                        ? 'bg-surface font-weight-label text-heading'
                        : 'text-fg hover:bg-ghost-surface',
                    ].join(' ')}
                  >
                    <span className="min-w-0 truncate">{serviceObjectLabel(item)}</span>
                    <span className="shrink-0 text-caption text-fg-secondary">
                      {item.object_id}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div>
          <p className="text-body-sm font-weight-label text-heading">
            {t('business_sign_params_editor_title')}
          </p>
          <p className="mt-1 text-caption text-fg-secondary">
            {t('business_sign_params_editor_hint')}
          </p>
        </div>

        {signParams.map((param, index) => (
          <div
            key={`sign-param-${index}`}
            className="flex flex-col gap-2 rounded-card border border-border p-3"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={offerEditorLabelClass}>
                {t('business_sign_params_field_key')}
                <input
                  type="text"
                  value={param.key}
                  onChange={(e) => {
                    const next = [...signParams];
                    next[index] = { ...param, key: e.target.value };
                    updateSignParams(next);
                  }}
                  className={offerEditorFieldClass}
                />
              </label>
              <label className={offerEditorLabelClass}>
                {t('business_sign_params_field_label')}
                <input
                  type="text"
                  value={param.label}
                  onChange={(e) => {
                    const next = [...signParams];
                    next[index] = { ...param, label: e.target.value };
                    updateSignParams(next);
                  }}
                  className={offerEditorFieldClass}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                checked={param.required === true}
                onChange={(e) => {
                  const next = [...signParams];
                  next[index] = { ...param, required: e.target.checked };
                  updateSignParams(next);
                }}
              />
              {t('business_sign_params_field_required')}
            </label>
            <button
              type="button"
              onClick={() => updateSignParams(signParams.filter((_, i) => i !== index))}
              className="w-fit text-body-sm text-link"
            >
              {t('business_sign_params_remove')}
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => updateSignParams([...signParams, emptySignParam()])}
          className="w-fit rounded-btn border border-border px-3 py-1 text-body-sm"
        >
          {t('business_sign_params_add')}
        </button>
      </div>
    </div>
  );
}
