'use client';

import { Popup } from 'react-leaflet';

import type { AppPopupProps } from '../../types';

export function LeafletAppPopup({ children }: AppPopupProps) {
  return <Popup>{children}</Popup>;
}
