/** Sandboxed widget iframe — no allow-same-origin (isolates untrusted on-chain HTML). */
export const WIDGET_EMBED_SANDBOX =
  'allow-scripts allow-popups allow-forms allow-presentation' as const;
