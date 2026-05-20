'use client';

import { useEffect } from 'react';

import {
  WALLET_SYMBOLS,
  type WalletSymbol,
} from '@opden-data-layer/core/update-registry';

const WALLET_SYMBOL_SET = new Set<string>(WALLET_SYMBOLS);

function isWalletSymbol(value: string): value is WalletSymbol {
  return WALLET_SYMBOL_SET.has(value);
}
import { useI18n } from '@/i18n/providers/i18n-provider';

export type WalletAddressFormProps = {
  value: unknown;
  onChange: (value: unknown) => void;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function WalletAddressForm({ value, onChange }: WalletAddressFormProps) {
  const { t } = useI18n();
  const obj = asRecord(value);

  const symbol =
    typeof obj.symbol === 'string' && isWalletSymbol(obj.symbol)
      ? obj.symbol
      : WALLET_SYMBOLS[0];
  const address = typeof obj.address === 'string' ? obj.address : '';
  const title = typeof obj.title === 'string' ? obj.title : '';

  function patch(next: Record<string, unknown>) {
    onChange({ ...obj, ...next });
  }

  useEffect(() => {
    const sym = typeof obj.symbol === 'string' ? obj.symbol : '';
    if (!sym || !isWalletSymbol(sym)) {
      onChange({
        symbol: WALLET_SYMBOLS[0],
        address: typeof obj.address === 'string' ? obj.address : '',
        title: typeof obj.title === 'string' ? obj.title : '',
      });
    }
  }, [obj.symbol, obj.address, obj.title, onChange]);

  return (
    <fieldset className="space-y-3 text-sm">
      <label className="block">
        <span className="font-medium text-fg">{t('object_edit_wallet_symbol')}</span>
        <select
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={symbol}
          onChange={(e) => patch({ symbol: e.target.value })}
        >
          {WALLET_SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="font-medium text-fg">{t('object_edit_wallet_address')}</span>
        <input
          type="text"
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={address}
          onChange={(e) => patch({ address: e.target.value, symbol })}
          autoComplete="off"
        />
      </label>
      <label className="block">
        <span className="text-muted">{t('object_edit_wallet_title')}</span>
        <input
          type="text"
          className="mt-2 w-full rounded-btn border border-border bg-bg px-3 py-2 text-fg"
          value={title}
          onChange={(e) => patch({ title: e.target.value || undefined, symbol })}
        />
      </label>
    </fieldset>
  );
}
