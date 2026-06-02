'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  MENU_ITEM_STYLES,
  type MenuItemStyle,
} from '@opden-data-layer/core/update-registry';
import { UPDATE_TYPES } from '@opden-data-layer/core/update-types';

import type { SearchObjectResult } from '@/modules/app-header/domain/search-response.schema';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { resolveMenuItemLinkType, type MenuItemLinkType } from '../../application/menu-item-form-value';
import { ObjectRefSearchField } from './object-ref-search-field';

export type MenuItemFormProps = {
  value: unknown;
  onChange: (value: unknown) => void;
};

function asMenuItemRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function MenuItemForm({ value, onChange }: MenuItemFormProps) {
  const { t } = useI18n();
  const obj = asMenuItemRecord(value);

  const [linkType, setLinkType] = useState<MenuItemLinkType>(() =>
    resolveMenuItemLinkType(obj),
  );

  const linkedObjectId =
    typeof obj.link_to_object === 'string' ? obj.link_to_object.trim() : '';

  useEffect(() => {
    setLinkType(resolveMenuItemLinkType(obj));
  }, [obj.link_to_web, obj.link_to_object]);

  const styleValue = (obj.style as MenuItemStyle | undefined) ?? MENU_ITEM_STYLES[0];

  const styleLabels: Record<MenuItemStyle, string> = useMemo(
    () => ({
      standard: t('object_edit_style_standard'),
      highlight: t('object_edit_style_highlight'),
      icon: t('object_edit_style_icon'),
      image: t('object_edit_style_image'),
    }),
    [t],
  );

  function patch(next: Record<string, unknown>) {
    onChange({ ...obj, ...next });
  }

  function onLinkTypeChange(next: MenuItemLinkType) {
    setLinkType(next);
    if (next === 'web') {
      patch({
        link_to_object: undefined,
        object_type: undefined,
      });
      return;
    }
    patch({
      link_to_web: undefined,
    });
  }

  function onObjectRefChange(objectId: string, result?: SearchObjectResult) {
    if (!objectId) {
      patch({
        link_to_object: undefined,
        object_type: undefined,
      });
      return;
    }
    patch({
      link_to_object: objectId,
      object_type: result?.object_type,
      link_to_web: undefined,
    });
  }

  return (
    <fieldset className="space-y-4 text-body-sm">
      <legend className="sr-only">{UPDATE_TYPES.MENU_ITEM}</legend>

      <label className="block">
        <span className="text-muted">{t('object_edit_menu_item_title')}</span>
        <input
          type="text"
          className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={typeof obj.title === 'string' ? obj.title : ''}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-muted">{t('object_edit_menu_item_style')}</span>
        <select
          className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={styleValue}
          onChange={(e) => patch({ style: e.target.value })}
        >
          {MENU_ITEM_STYLES.map((s) => (
            <option key={s} value={s}>
              {styleLabels[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-muted">{t('object_edit_menu_item_image')}</span>
        <input
          type="text"
          className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={typeof obj.image === 'string' ? obj.image : ''}
          onChange={(e) => patch({ image: e.target.value || undefined })}
        />
      </label>

      <div>
        <span className="text-muted">{t('object_edit_menu_item_link_type')}</span>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={[
              'flex-1 rounded-btn border px-3 py-2 text-body-sm font-weight-label transition-colors',
              linkType === 'object'
                ? 'border-accent bg-accent/10 text-fg'
                : 'border-border bg-bg text-fg-secondary hover:bg-surface',
            ].join(' ')}
            onClick={() => onLinkTypeChange('object')}
          >
            {t('object_edit_menu_item_link_object')}
          </button>
          <button
            type="button"
            className={[
              'flex-1 rounded-btn border px-3 py-2 text-body-sm font-weight-label transition-colors',
              linkType === 'web'
                ? 'border-accent bg-accent/10 text-fg'
                : 'border-border bg-bg text-fg-secondary hover:bg-surface',
            ].join(' ')}
            onClick={() => onLinkTypeChange('web')}
          >
            {t('object_edit_menu_item_link_web')}
          </button>
        </div>
      </div>

      {linkType === 'object' ? (
        <ObjectRefSearchField
          label={t('object_edit_menu_item_link_object')}
          value={linkedObjectId}
          onChange={onObjectRefChange}
        />
      ) : (
        <label className="block">
          <span className="text-muted">{t('object_edit_menu_item_link_web')}</span>
          <input
            type="url"
            className="mt-1 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
            value={typeof obj.link_to_web === 'string' ? obj.link_to_web : ''}
            onChange={(e) =>
              patch({
                link_to_web: e.target.value || undefined,
                link_to_object: undefined,
                object_type: undefined,
              })
            }
          />
        </label>
      )}
    </fieldset>
  );
}
