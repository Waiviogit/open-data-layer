'use client';

import { createContext, useContext, type ReactNode } from 'react';

const IpfsContentBaseContext = createContext('');

export type IpfsContentBaseProviderProps = {
  contentBaseUrl: string;
  children: ReactNode;
};

/**
 * Supplies {@link IPFS_CONTENT_BASE_URL} from the server layout (runtime compose env).
 * Client image previews must use {@link useIpfsContentBaseUrl}, not build-time env.
 */
export function IpfsContentBaseProvider({
  contentBaseUrl,
  children,
}: IpfsContentBaseProviderProps) {
  return (
    <IpfsContentBaseContext.Provider value={contentBaseUrl}>
      {children}
    </IpfsContentBaseContext.Provider>
  );
}

export function useIpfsContentBaseUrl(): string {
  return useContext(IpfsContentBaseContext);
}
