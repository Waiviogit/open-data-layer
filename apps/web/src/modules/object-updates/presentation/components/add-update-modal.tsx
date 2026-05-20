'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  buildOdlUpdateCreateOp,
  buildOdlUpdateCreateWithLikeOp,
} from '@opden-data-layer/hive-broadcast';
import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';

import { DEFAULT_LOCALE } from '@/i18n/config/default-locale';
import { locales } from '@/i18n/config/locales';
import { ODL_CUSTOM_JSON_ID } from '@/config/odl-network-public';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';
import { formatUpdateCountLabel } from '@/modules/object/domain/update-count-label';
import { getWalletFacade, useHydrateWalletProvider } from '@/modules/auth';
import { awaitTrxConfirmation } from '@/modules/notifications';

import {
  defaultUpdateTypeForCandidates,
  initialFormValueForUpdateTypeWithContext,
} from '../../application/tag-category-item-form-value';
import { validateUpdateValue } from '../../application/update-value-form.utils';
import {
  type AddUpdateModalProps,
  isFeedAddModalProps,
  isLeftRailModalProps,
  isTypePickerModalProps,
} from './add-update-modal.types';
import type { UpdateTypeOption } from './update-filter-bar';
import { UpdateTypeSelectField } from './update-type-select-field';
import { UpdateValueForm } from './update-value-form';

function buildTypeSelectOptions(
  types: readonly string[],
  counts: Record<string, number> | undefined,
  t: (key: string) => string,
): UpdateTypeOption[] {
  return types.map((value) => {
    const count = counts?.[value] ?? 0;
    const typeLabel = labelForUpdateType(value);
    return {
      value,
      label: `${typeLabel} — ${formatUpdateCountLabel(count, t)}`,
      count,
    };
  });
}

function resolveInitialUpdateType(
  candidateUpdateTypes: readonly string[],
  initialUpdateType: string | undefined,
  tagCategoryNames: readonly string[],
): string {
  if (
    initialUpdateType &&
    candidateUpdateTypes.includes(initialUpdateType)
  ) {
    return initialUpdateType;
  }
  return defaultUpdateTypeForCandidates(candidateUpdateTypes, tagCategoryNames);
}

function resolveInitialLocale(
  updateType: string,
  initialLocale: string | undefined,
): string {
  const definition = UPDATE_REGISTRY[updateType];
  if (!definition?.localizable) {
    return DEFAULT_LOCALE;
  }
  if (initialLocale && locales.some((l) => l.id === initialLocale)) {
    return initialLocale;
  }
  return DEFAULT_LOCALE;
}

export function AddUpdateModal(props: AddUpdateModalProps) {
  const {
    open,
    onClose,
    objectId,
    viewerUsername,
    tagCategoryNames = [],
    updateTypeCounts,
  } = props;

  const leftRail = isLeftRailModalProps(props);
  const feedAdd = isFeedAddModalProps(props);
  const typePicker = isTypePickerModalProps(props);
  const candidateUpdateTypes = typePicker ? props.candidateUpdateTypes : [];
  const genericUpdateType = props.mode === 'generic' ? props.updateType : '';
  const pickerInitialType = typePicker ? props.initialUpdateType : undefined;
  const feedInitialLocale = feedAdd ? props.initialLocale : undefined;

  const resolveType = (): string => {
    if (typePicker) {
      return resolveInitialUpdateType(
        candidateUpdateTypes,
        pickerInitialType,
        tagCategoryNames,
      );
    }
    return genericUpdateType;
  };

  useHydrateWalletProvider();
  const { t } = useI18n();
  const router = useRouter();

  const [selectedType, setSelectedType] = useState(() => resolveType());
  const [value, setValue] = useState<unknown>(() => {
    const type = resolveType();
    return type && UPDATE_REGISTRY[type]
      ? initialFormValueForUpdateTypeWithContext(type, tagCategoryNames)
      : null;
  });
  const [locale, setLocale] = useState(() =>
    resolveInitialLocale(resolveType(), feedInitialLocale),
  );
  const [isValid, setIsValid] = useState(false);
  const [likeChecked, setLikeChecked] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const definition = selectedType ? UPDATE_REGISTRY[selectedType] : undefined;
  const hideUpdateTypeHeading = typePicker;

  useEffect(() => {
    if (!open) {
      return;
    }
    const type = resolveType();
    setSelectedType(type);
    setError(null);
    setSubmitting(false);
    setLikeChecked(true);
    setLocale(resolveInitialLocale(type, feedInitialLocale));
    if (type && UPDATE_REGISTRY[type]) {
      setValue(initialFormValueForUpdateTypeWithContext(type, tagCategoryNames));
    } else {
      setValue(null);
    }
  }, [
    open,
    typePicker,
    genericUpdateType,
    candidateUpdateTypes,
    tagCategoryNames,
    pickerInitialType,
    feedInitialLocale,
  ]);

  const onTypeChange = useCallback(
    (nextType: string) => {
      setSelectedType(nextType);
      setError(null);
      setLocale(DEFAULT_LOCALE);
      if (nextType && UPDATE_REGISTRY[nextType]) {
        setValue(
          initialFormValueForUpdateTypeWithContext(nextType, tagCategoryNames),
        );
      } else {
        setValue(null);
      }
    },
    [tagCategoryNames],
  );

  const handleSubmit = useCallback(async () => {
    if (!definition || !isValid || submitting) {
      return;
    }
    const parsed = validateUpdateValue(definition, value);
    if (!parsed.success) {
      setError(t('object_edit_validation_error'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const createInput = {
        id: ODL_CUSTOM_JSON_ID,
        objectId,
        updateType: selectedType,
        creator: viewerUsername,
        valueKind: definition.value_kind,
        value: parsed.value,
        locale: definition.localizable ? locale : undefined,
        required_posting_auths: [viewerUsername],
      } as const;
      const op = likeChecked
        ? buildOdlUpdateCreateWithLikeOp(createInput)
        : buildOdlUpdateCreateOp(createInput);
      const { transactionId } = await getWalletFacade().broadcast({
        operations: [op],
      });
      onClose();
      void awaitTrxConfirmation(transactionId).finally(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('object_edit_validation_error'));
      setSubmitting(false);
    }
  }, [
    definition,
    isValid,
    submitting,
    value,
    objectId,
    selectedType,
    viewerUsername,
    locale,
    likeChecked,
    onClose,
    router,
    t,
  ]);

  if (!open) {
    return null;
  }

  const typeSelectOptions = leftRail
    ? selectedType && UPDATE_REGISTRY[selectedType]
      ? buildTypeSelectOptions([selectedType], updateTypeCounts, t)
      : []
    : feedAdd
      ? buildTypeSelectOptions(candidateUpdateTypes, updateTypeCounts, t)
      : genericUpdateType
        ? buildTypeSelectOptions([genericUpdateType], updateTypeCounts, t)
        : [];

  const showTypeSelect = typeSelectOptions.length > 0;

  const dialog = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-update-dialog-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card-lg border border-border bg-surface p-card-padding shadow-card-float">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id="add-update-dialog-title"
            className="text-section font-display text-heading"
          >
            {t('object_edit_modal_title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-btn px-2 py-1 text-body-sm text-fg-secondary hover:bg-ghost-surface hover:text-fg"
          >
            {t('object_edit_cancel')}
          </button>
        </div>

        {showTypeSelect ? (
          <UpdateTypeSelectField
            label={t('object_edit_suggest_field')}
            value={selectedType}
            options={typeSelectOptions}
            onChange={onTypeChange}
            disabled={leftRail || submitting}
          />
        ) : null}

        {definition ? (
          <div className={showTypeSelect ? 'mt-4' : undefined}>
            <UpdateValueForm
              updateType={selectedType}
              value={value}
              onChange={setValue}
              onValidityChange={setIsValid}
              tagCategoryNames={tagCategoryNames}
              hideUpdateTypeHeading={hideUpdateTypeHeading}
            />
            {definition.localizable ? (
              <label className="mt-4 block text-sm">
                <span className="font-medium text-fg">{t('object_edit_locale_label')}</span>
                <select
                  className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  disabled={submitting}
                >
                  {locales.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">{t('object_edit_validation_error')}</p>
        )}

        {error ? (
          <p className="mt-3 text-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            className="size-4 rounded border-border accent-accent"
            checked={likeChecked}
            onChange={(e) => setLikeChecked(e.target.checked)}
            disabled={submitting}
          />
          <span>{t('like')}</span>
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-btn border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface"
          >
            {t('object_edit_cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!isValid || submitting || !definition}
            className="rounded-btn bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? t('object_edit_submitting') : t('object_edit_submit')}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(dialog, document.body);
}

export type {
  AddUpdateModalFeedAddProps,
  AddUpdateModalGenericProps,
  AddUpdateModalLeftRailProps,
  AddUpdateModalMode,
  AddUpdateModalProps,
} from './add-update-modal.types';
