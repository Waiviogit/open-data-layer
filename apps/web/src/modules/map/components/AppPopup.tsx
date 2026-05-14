'use client';

import { useMapProvider } from '../providers/map-provider.context';
import type { AppPopupProps } from '../types';

/** Typically nested under {@link AppMarker}. */
export function AppPopup(props: AppPopupProps) {
  const { Popup } = useMapProvider();
  return <Popup {...props} />;
}
