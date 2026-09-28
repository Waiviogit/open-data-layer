'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { DEFAULT_HIVE_TX_EXPLORER_BASE_URL } from './hive-tx-explorer.constants';

const HiveTxExplorerBaseUrlContext = createContext(DEFAULT_HIVE_TX_EXPLORER_BASE_URL);

export type HiveTxExplorerProviderProps = {
  baseUrl: string;
  children: ReactNode;
};

/**
 * Supplies {@link HIVE_TX_EXPLORER_BASE_URL} from the server layout (runtime compose env).
 * Client links must use {@link useHiveTxExplorerBaseUrl}, not build-time env.
 */
export function HiveTxExplorerProvider({
  baseUrl,
  children,
}: HiveTxExplorerProviderProps) {
  return (
    <HiveTxExplorerBaseUrlContext.Provider value={baseUrl}>
      {children}
    </HiveTxExplorerBaseUrlContext.Provider>
  );
}

export function useHiveTxExplorerBaseUrl(): string {
  return useContext(HiveTxExplorerBaseUrlContext);
}
