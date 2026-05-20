'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { CUSTOM_JSON_ID } from './odl-network';

const OdlCustomJsonIdContext = createContext<string>(CUSTOM_JSON_ID.ODL_MAINNET);

export type OdlNetworkProviderProps = {
  customJsonId: string;
  children: ReactNode;
};

/**
 * Supplies Hive `custom_json.id` from server runtime env (`ODL_NETWORK`).
 * Client broadcasts must use {@link useOdlCustomJsonId}, not a build-time constant.
 */
export function OdlNetworkProvider({
  customJsonId,
  children,
}: OdlNetworkProviderProps) {
  return (
    <OdlCustomJsonIdContext.Provider value={customJsonId}>
      {children}
    </OdlCustomJsonIdContext.Provider>
  );
}

export function useOdlCustomJsonId(): string {
  return useContext(OdlCustomJsonIdContext);
}
