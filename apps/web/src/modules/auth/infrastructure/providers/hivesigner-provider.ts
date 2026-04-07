'use client';

export function redirectToHiveSigner(authorizeUrl: string): void {
  window.location.assign(authorizeUrl);
}
