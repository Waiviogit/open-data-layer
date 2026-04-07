'use client';

import type { WalletProviderMeta } from '../../domain/types';

const CATEGORY_LABEL: Record<WalletProviderMeta['category'], string> = {
  extension: 'Browser extension',
  mobile: 'Mobile',
  web: 'Web',
};

export type ProviderListProps = {
  providers: readonly WalletProviderMeta[];
  selectedId: string | null;
  onSelect: (id: WalletProviderMeta['id']) => void;
};

export function ProviderList({ providers, selectedId, onSelect }: ProviderListProps) {
  const byCategory = providers.reduce<
    Partial<Record<WalletProviderMeta['category'], WalletProviderMeta[]>>
  >((acc, p) => {
    const list = acc[p.category] ?? [];
    list.push(p);
    acc[p.category] = list;
    return acc;
  }, {});

  const categories = (
    ['extension', 'mobile', 'web'] as const
  ).filter((c) => byCategory[c]?.length);

  return (
    <div className="flex flex-col gap-card-padding">
      {categories.map((cat) => (
        <div key={cat}>
          <p className="text-caption font-label text-fg-secondary mb-2">
            {CATEGORY_LABEL[cat]}
          </p>
          <ul className="flex flex-col gap-2">
            {byCategory[cat]?.map((p) => {
              const active = selectedId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    className={`w-full rounded-btn border px-4 py-3 text-left text-body transition-colors ${
                      active
                        ? 'border-border-strong bg-surface-alt text-fg'
                        : 'border-border bg-surface text-fg hover:bg-ghost-surface'
                    }`}
                  >
                    <span className="font-label text-body">{p.displayName}</span>
                    {p.isCustodial ? (
                      <span className="ml-2 text-caption text-fg-tertiary">
                        (custodial)
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
