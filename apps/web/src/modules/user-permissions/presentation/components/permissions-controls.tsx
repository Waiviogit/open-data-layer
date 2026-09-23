'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { ChevronDownIcon, PlusIcon } from '@/icons';
import { useI18n } from '@/i18n/providers/i18n-provider';
import { SortDropdown } from '@/modules/user-social/presentation/components/sort-dropdown';
import { useInstantNavigation } from '@/shared/presentation';

import {
  USER_PERMISSIONS_AUTHORITY_TYPES,
  USER_PERMISSIONS_SORTS,
  type UserPermissionsAuthorityType,
  type UserPermissionsSort,
} from '../../application/dto/user-permissions.dto';

function FilterSelectChevron({ open }: { open: boolean }) {
  return (
    <ChevronDownIcon
      size={12}
      strokeWidth={1.5}
      className={`shrink-0 text-fg-secondary transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
    />
  );
}

export function PermissionsTabLinks({
  profileAccountName,
}: {
  profileAccountName: string;
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const baseHref = `/@${encodeURIComponent(profileAccountName)}/permissions`;

  const tabs = [
    { value: 'granted' as const, label: t('permissions_tab_granted') },
    { value: 'received' as const, label: t('permissions_tab_received') },
  ];

  const activeTab = searchParams.get('tab') === 'received' ? 'received' : 'granted';

  return (
    <div className="flex gap-4 border-b border-border">
      {tabs.map((tab) => {
        const u = new URLSearchParams(searchParams.toString());
        if (tab.value === 'granted') {
          u.delete('tab');
        } else {
          u.set('tab', tab.value);
        }
        const qs = u.toString();
        const href = qs.length > 0 ? `${baseHref}?${qs}` : baseHref;
        const selected = activeTab === tab.value;
        return (
          <Link
            key={tab.value}
            href={href}
            aria-current={selected ? 'page' : undefined}
            className={[
              'border-b-2 px-1 pb-3 text-body-sm transition-colors',
              selected
                ? 'border-accent font-weight-label text-fg'
                : 'border-transparent text-fg-secondary hover:text-fg',
            ].join(' ')}
            suppressHydrationWarning
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function PermissionsAuthorityFilterSelect() {
  const { t } = useI18n();
  const { navigateInstant } = useInstantNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const activeType = useMemo((): UserPermissionsAuthorityType | 'all' => {
    const raw = searchParams.get('type') ?? '';
    return USER_PERMISSIONS_AUTHORITY_TYPES.includes(raw as UserPermissionsAuthorityType)
      ? (raw as UserPermissionsAuthorityType)
      : 'all';
  }, [searchParams]);

  const options: { value: UserPermissionsAuthorityType | 'all'; label: string }[] = [
    { value: 'all', label: t('permissions_filter_all') },
    { value: 'posting', label: t('permissions_filter_posting') },
    { value: 'active', label: t('permissions_filter_active') },
    { value: 'owner', label: t('permissions_filter_owner') },
  ];

  const displayLabel =
    options.find((option) => option.value === activeType)?.label ??
    t('permissions_filter_all');

  const onSelect = useCallback(
    (next: UserPermissionsAuthorityType | 'all') => {
      const u = new URLSearchParams(searchParams.toString());
      if (next === 'all') {
        u.delete('type');
      } else {
        u.set('type', next);
      }
      const qs = u.toString();
      navigateInstant({
        href: qs.length > 0 ? `${pathname}?${qs}` : pathname,
        method: 'replace',
        scroll: false,
      });
      setOpen(false);
    },
    [navigateInstant, pathname, searchParams],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-btn border border-border bg-surface-control px-3 py-2 text-start text-body-sm text-fg hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{displayLabel}</span>
        <FilterSelectChevron open={open} />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('permissions_filter_all')}
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-y-auto rounded-card border border-border bg-surface-raised shadow-card-float scrollbar-minimal"
        >
          {options.map((option) => {
            const selected = option.value === activeType;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(option.value)}
                className={`cursor-pointer px-3 py-2 text-body-sm transition-colors hover:bg-surface-alt ${
                  selected
                    ? 'bg-surface-alt font-weight-label text-fg'
                    : 'text-fg-secondary'
                }`}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function PermissionsSortControl() {
  const { t } = useI18n();
  const { navigateInstant } = useInstantNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = useMemo((): UserPermissionsSort => {
    const raw = searchParams.get('sort') ?? '';
    return USER_PERMISSIONS_SORTS.includes(raw as UserPermissionsSort)
      ? (raw as UserPermissionsSort)
      : 'a-z';
  }, [searchParams]);

  const options = useMemo(
    () => [
      { value: 'recency' as const, label: t('social_sort_recency') },
      { value: 'rank' as const, label: t('social_sort_rank') },
      { value: 'followers' as const, label: t('social_sort_followers') },
      { value: 'a-z' as const, label: t('social_sort_az') },
    ],
    [t],
  );

  const onChange = useCallback(
    (next: UserPermissionsSort) => {
      const u = new URLSearchParams(searchParams.toString());
      if (next === 'a-z') {
        u.delete('sort');
      } else {
        u.set('sort', next);
      }
      const qs = u.toString();
      navigateInstant({
        href: qs.length > 0 ? `${pathname}?${qs}` : pathname,
        method: 'replace',
        scroll: false,
      });
    },
    [navigateInstant, pathname, searchParams],
  );

  return <SortDropdown value={sort} options={options} onChange={onChange} />;
}

export function PermissionsFilterBar({ onGrant }: { onGrant?: () => void }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-btn border border-border p-2 sm:flex-nowrap">
        <PermissionsAuthorityFilterSelect />
        {onGrant ? (
          <button
            type="button"
            onClick={onGrant}
            className="inline-flex shrink-0 items-center gap-2 px-1 text-body-sm text-link hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:ms-auto"
          >
            <span className="inline-flex size-7 items-center justify-center rounded-pill bg-accent text-accent-fg">
              <PlusIcon size="xs" strokeWidth={1.75} />
            </span>
            <span className="font-weight-label">{t('permissions_add_authority')}</span>
          </button>
        ) : null}
      </div>
      <div className="flex justify-end">
        <PermissionsSortControl />
      </div>
    </div>
  );
}
