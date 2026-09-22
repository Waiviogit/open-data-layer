'use client';

import { useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { formatObjectTypeLabel } from '@/modules/app-header/domain/search-nav-list';
import { CheckIcon, Icon, SearchIcon } from '@/icons';
import { ModalShell, useInstantNavigation } from '@/shared/presentation';

import { buildDiscoverHref } from '../../domain/discover-url';
import {
  listDiscoverObjectTypes,
  listDiscoverPopularObjectTypes,
  matchesDiscoverTypeSearch,
} from '../../domain/discover-registry';
import {
  DISCOVER_USERS_ICON,
  iconForDiscoverObjectType,
} from '../../domain/discover-type-icons';
import { writeDiscoverObjectTypeCookie } from '../../domain/discover-type-cookie';

export type DiscoverTypeSheetProps = {
  open: boolean;
  onClose: () => void;
  usersMode: boolean;
  objectType: string | null;
  q: string;
  sort: 'newest' | 'oldest' | 'rank';
};

function optionClassName(active: boolean): string {
  return [
    'flex w-full items-center justify-between gap-2 px-2 py-3 text-start text-body transition-colors',
    active
      ? 'bg-accent-soft font-weight-label text-accent'
      : 'text-fg hover:bg-ghost-surface',
  ].join(' ');
}

function DiscoverTypeOption({
  type,
  active,
  onSelect,
}: {
  type: string;
  active: boolean;
  onSelect: (type: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={optionClassName(active)}
      onClick={() => onSelect(type)}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <Icon name={iconForDiscoverObjectType(type)} size="sm" className="shrink-0" />
        <span className="truncate">{formatObjectTypeLabel(type)}</span>
      </span>
      {active ? <CheckIcon size={18} className="shrink-0 text-accent" /> : null}
    </button>
  );
}

export function DiscoverTypeSheet({
  open,
  onClose,
  usersMode,
  objectType,
  q,
  sort,
}: DiscoverTypeSheetProps) {
  const { t } = useI18n();
  const { navigateInstant } = useInstantNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  const types = useMemo(() => listDiscoverObjectTypes(), []);
  const popularTypes = useMemo(() => listDiscoverPopularObjectTypes(), []);
  const filteredPopular = useMemo(
    () => popularTypes.filter((type) => matchesDiscoverTypeSearch(type, searchQuery)),
    [popularTypes, searchQuery],
  );
  const filteredAll = useMemo(
    () => types.filter((type) => matchesDiscoverTypeSearch(type, searchQuery)),
    [types, searchQuery],
  );
  const showNoResults = filteredPopular.length === 0 && filteredAll.length === 0;

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const selectObjectType = (type: string) => {
    writeDiscoverObjectTypeCookie(type);
    const href = buildDiscoverHref({ type, q, sort });
    navigateInstant({ href, method: 'replace', scroll: false });
    onClose();
  };

  const selectUsers = () => {
    const href = buildDiscoverHref({ users: true, q, sort });
    navigateInstant({ href, method: 'replace', scroll: false });
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      variant="sheet"
      ariaLabel={t('discover_select_type')}
      scrollBody
      header={
        <div className="border-b border-border px-gutter pb-3 pt-2">
          <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-border" aria-hidden />
          <h2 className="text-center text-heading font-weight-label text-fg">
            {t('discover_page_title')}
          </h2>
          <div className="relative mt-3 flex items-center gap-2 rounded-btn border border-border bg-surface-control px-3 py-2">
            <SearchIcon size={18} className="shrink-0 text-fg-secondary" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('discover_search_object_types')}
              className="min-w-0 flex-1 border-0 bg-transparent text-body text-fg outline-none placeholder:text-fg-tertiary"
            />
          </div>
        </div>
      }
    >
      <div className="px-gutter pb-gutter">
        {filteredPopular.length > 0 ? (
          <section>
            <p className="mb-2 text-caption font-weight-label uppercase tracking-loose text-fg-tertiary">
              {t('object_create_group_popular')}
            </p>
            <ul className="divide-y divide-border border-y border-border">
              {filteredPopular.map((type) => (
                <li key={`popular-${type}`}>
                  <DiscoverTypeOption
                    type={type}
                    active={!usersMode && objectType === type}
                    onSelect={selectObjectType}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={filteredPopular.length > 0 ? 'mt-6' : undefined}>
          <p className="mb-2 text-caption font-weight-label uppercase tracking-loose text-fg-tertiary">
            {t('discover_users_menu')}
          </p>
          <ul className="divide-y divide-border border-y border-border">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={usersMode}
                className={optionClassName(usersMode)}
                onClick={selectUsers}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Icon name={DISCOVER_USERS_ICON} size="sm" className="shrink-0" />
                  <span>{t('discover_all_users')}</span>
                </span>
                {usersMode ? <CheckIcon size={18} className="shrink-0 text-accent" /> : null}
              </button>
            </li>
          </ul>
        </section>

        {filteredAll.length > 0 ? (
          <section className="mt-6">
            <p className="mb-2 text-caption font-weight-label uppercase tracking-loose text-fg-tertiary">
              {t('discover_all_types_menu')}
            </p>
            <ul className="divide-y divide-border border-y border-border">
              {filteredAll.map((type) => (
                <li key={`all-${type}`}>
                  <DiscoverTypeOption
                    type={type}
                    active={!usersMode && objectType === type}
                    onSelect={selectObjectType}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showNoResults ? (
          <p className="py-4 text-body-sm text-fg-secondary">{t('discover_no_results')}</p>
        ) : null}
      </div>
    </ModalShell>
  );
}
