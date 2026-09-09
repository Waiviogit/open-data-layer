'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { UPDATE_REGISTRY } from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';
import { buildOdlUpdateCreateOp } from '@opden-data-layer/hive-broadcast';

import { DEFAULT_LOCALE } from '@/i18n/config/default-locale';
import { locales } from '@/i18n/config/locales';
import { useOdlCustomJsonId } from '@/config/odl-network-provider';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { labelForUpdateType } from '@/modules/object/domain/object-update-labels';
import { useHydrateWalletProvider } from '@/modules/auth';
import { broadcastOdlOpWithOverflow } from '../../application/broadcast-odl-op-with-overflow';
import { refreshAfterBroadcast } from '@/shared/infrastructure/query/refresh-after-broadcast';
import { revalidateObjectAfterBroadcast } from '@/shared/infrastructure/query/revalidate-after-broadcast.server';
import { ModalShell, ModalShellCloseButton, MODAL_Z_INDEX_ABOVE_MAP } from '@/shared/presentation';

import {
  defaultUpdateTypeForCandidates,
  initialFormValueForUpdateTypeWithContext,
} from '../../application/tag-category-item-form-value';
import { initialListSortCustomFormValue } from '../../application/list-sort-custom-form-value';
import { buildGalleryItemBroadcastOp } from '../../application/build-gallery-item-broadcast-op';
import { galleryAlbumPickerNames } from '../../application/gallery-form-value';
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

/** Stable default — do not use `= []` in props/deps (new reference every render). */
const EMPTY_STRING_ARRAY: readonly string[] = [];
const EMPTY_LIST_CATALOG_ITEMS: readonly import('@/modules/object/domain/projected-list-item.types').ProjectedListItem[] = [];

function buildTypeSelectOptions(types: readonly string[]): UpdateTypeOption[] {
  return types.map((value) => ({
    value,
    label: labelForUpdateType(value),
  }));
}

function resolveInitialUpdateType(
  candidateUpdateTypes: readonly string[],
  initialUpdateType: string | undefined,
  tagCategoryNames: readonly string[],
  galleryAlbumNames: readonly string[],
): string {
  if (
    initialUpdateType &&
    candidateUpdateTypes.includes(initialUpdateType)
  ) {
    return initialUpdateType;
  }
  return defaultUpdateTypeForCandidates(
    candidateUpdateTypes,
    tagCategoryNames,
    galleryAlbumNames,
  );
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
    tagCategoryNames = EMPTY_STRING_ARRAY,
    galleryAlbumNames: galleryAlbumNamesProp = EMPTY_STRING_ARRAY,
    onChainGalleryAlbumNames: onChainGalleryAlbumNamesProp = EMPTY_STRING_ARRAY,
    listCatalogItems = EMPTY_LIST_CATALOG_ITEMS,
    listSortCustom = null,
  } = props;

  const odlCustomJsonId = useOdlCustomJsonId();
  const leftRail = isLeftRailModalProps(props);
  const feedAdd = isFeedAddModalProps(props);
  const typePicker = isTypePickerModalProps(props);
  const candidateUpdateTypes = typePicker ? props.candidateUpdateTypes : [];
  const genericUpdateType = props.mode === 'generic' ? props.updateType : '';
  const genericInitialValue =
    props.mode === 'generic' ? props.initialValue : undefined;
  const galleryAlbumNames = galleryAlbumNamesProp;
  const onChainGalleryAlbumNames =
    onChainGalleryAlbumNamesProp.length > 0
      ? onChainGalleryAlbumNamesProp
      : galleryAlbumNames;
  const lockGalleryAlbum =
    props.mode === 'generic' ? (props.lockGalleryAlbum ?? false) : false;
  const pickerInitialType = typePicker ? props.initialUpdateType : undefined;
  const feedInitialLocale = feedAdd ? props.initialLocale : undefined;

  const resolveType = (): string => {
    if (typePicker) {
      return resolveInitialUpdateType(
        candidateUpdateTypes,
        pickerInitialType,
        tagCategoryNames,
        galleryAlbumNames,
      );
    }
    return genericUpdateType;
  };

  useHydrateWalletProvider();
  const { t } = useI18n();
  const router = useRouter();

  const resolveFormValue = (type: string): unknown => {
    if (props.mode === 'generic' && genericInitialValue !== undefined) {
      return genericInitialValue;
    }
    if (type === UPDATE_TYPES.SORT_CUSTOM && listCatalogItems.length > 0) {
      return initialListSortCustomFormValue(listCatalogItems, listSortCustom);
    }
    if (type && UPDATE_REGISTRY[type]) {
      const presetAlbum =
        props.mode === 'generic' && lockGalleryAlbum && typeof genericInitialValue === 'object'
          && genericInitialValue !== null
          && typeof (genericInitialValue as Record<string, unknown>).album === 'string'
          ? String((genericInitialValue as Record<string, unknown>).album)
          : undefined;
      return initialFormValueForUpdateTypeWithContext(
        type,
        tagCategoryNames,
        presetAlbum,
      );
    }
    return null;
  };

  const [selectedType, setSelectedType] = useState(() => resolveType());
  const [value, setValue] = useState<unknown>(() => resolveFormValue(resolveType()));
  const [locale, setLocale] = useState(() =>
    resolveInitialLocale(resolveType(), feedInitialLocale),
  );
  const [isValid, setIsValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  const definition = selectedType ? UPDATE_REGISTRY[selectedType] : undefined;
  const hideUpdateTypeHeading = typePicker;

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    const shouldInitialize = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (!shouldInitialize) {
      return;
    }
    const type = resolveType();
    setSelectedType(type);
    setError(null);
    setSubmitting(false);
    setLocale(resolveInitialLocale(type, feedInitialLocale));
    if (type && UPDATE_REGISTRY[type]) {
      setValue(resolveFormValue(type));
    } else {
      setValue(null);
    }
  }, [
    open,
    typePicker,
    genericUpdateType,
    genericInitialValue,
    lockGalleryAlbum,
    candidateUpdateTypes,
    tagCategoryNames,
    galleryAlbumNames,
    pickerInitialType,
    feedInitialLocale,
    listCatalogItems,
    listSortCustom,
  ]);

  const onTypeChange = useCallback(
    (nextType: string) => {
      setSelectedType(nextType);
      setError(null);
      setLocale(DEFAULT_LOCALE);
      if (nextType === UPDATE_TYPES.SORT_CUSTOM && listCatalogItems.length > 0) {
        setValue(initialListSortCustomFormValue(listCatalogItems, listSortCustom));
        return;
      }
      if (nextType && UPDATE_REGISTRY[nextType]) {
        setValue(
          initialFormValueForUpdateTypeWithContext(nextType, tagCategoryNames),
        );
      } else {
        setValue(null);
      }
    },
    [listCatalogItems, listSortCustom, tagCategoryNames],
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
        id: odlCustomJsonId,
        objectId,
        updateType: selectedType,
        creator: viewerUsername,
        valueKind: definition.value_kind,
        value: parsed.value,
        locale: definition.localizable ? locale : undefined,
        required_posting_auths: [viewerUsername],
      } as const;
      const op =
        selectedType === UPDATE_TYPES.IMAGE_GALLERY_ITEM
          ? buildGalleryItemBroadcastOp({
              id: odlCustomJsonId,
              objectId,
              creator: viewerUsername,
              itemValue: parsed.value,
              onChainGalleryAlbumNames,
            })
          : buildOdlUpdateCreateOp(createInput);
      const result = await broadcastOdlOpWithOverflow({
        op,
        account: viewerUsername,
        odlCustomJsonId,
        objectId,
      });
      if (!result.success) {
        if (result.error === 'unauthorized') {
          setError(t('object_edit_upload_unauthorized'));
        } else if (result.error === 'upload_failed') {
          setError(t('object_edit_upload_failed'));
        } else {
          setError(t('object_edit_validation_error'));
        }
        setSubmitting(false);
        return;
      }
      onClose();
      void refreshAfterBroadcast(router, () => revalidateObjectAfterBroadcast(objectId));
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
    onChainGalleryAlbumNames,
    odlCustomJsonId,
    onClose,
    router,
    t,
  ]);

  if (!open) {
    return null;
  }

  const typeSelectOptions = leftRail
    ? selectedType && UPDATE_REGISTRY[selectedType]
      ? buildTypeSelectOptions([selectedType])
      : []
    : feedAdd
      ? buildTypeSelectOptions(candidateUpdateTypes)
      : genericUpdateType
        ? buildTypeSelectOptions([genericUpdateType])
        : [];

  const showTypeSelect = typeSelectOptions.length > 0;

  const header = (
    <div className="flex items-center justify-between gap-4 border-b border-border px-card-padding py-3">
      <h2
        id="add-update-dialog-title"
        className="min-w-0 flex-1 text-section font-display text-heading"
      >
        {t('object_edit_modal_title')}
      </h2>
      <ModalShellCloseButton
        onClose={onClose}
        disabled={submitting}
        ariaLabel={t('object_edit_cancel')}
      />
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-2 border-t border-border px-card-padding py-3">
      <button
        type="button"
        onClick={onClose}
        disabled={submitting}
        className="rounded-btn border border-border px-4 py-2 text-body-sm font-weight-label text-fg hover:bg-surface"
      >
        {t('object_edit_cancel')}
      </button>
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!isValid || submitting || !definition}
        className="rounded-btn bg-accent px-4 py-2 text-body-sm font-weight-label text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? t('object_edit_submitting') : t('object_edit_submit')}
      </button>
    </div>
  );

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      labelledBy="add-update-dialog-title"
      zIndex={MODAL_Z_INDEX_ABOVE_MAP}
      maxWidthClass="max-w-container-narrow"
      panelClassName="rounded-card-lg"
      header={header}
      footer={footer}
    >
      <div className="space-y-4 p-card-padding">
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
          <div>
            <UpdateValueForm
              updateType={selectedType}
              value={value}
              onChange={setValue}
              onValidityChange={setIsValid}
              tagCategoryNames={tagCategoryNames}
              galleryAlbumNames={galleryAlbumPickerNames(onChainGalleryAlbumNames)}
              lockGalleryAlbum={lockGalleryAlbum}
              hideUpdateTypeHeading={hideUpdateTypeHeading}
              listCatalogItems={listCatalogItems}
            />
            {definition.localizable ? (
              <label className="mt-4 block text-body-sm">
                <span className="font-weight-label text-fg">{t('object_edit_locale_label')}</span>
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
          <p className="text-body-sm text-muted">{t('object_edit_validation_error')}</p>
        )}

        {error ? (
          <p className="text-body-sm text-accent" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </ModalShell>
  );
}

export type {
  AddUpdateModalFeedAddProps,
  AddUpdateModalGenericProps,
  AddUpdateModalLeftRailProps,
  AddUpdateModalMode,
  AddUpdateModalProps,
} from './add-update-modal.types';
