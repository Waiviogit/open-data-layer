/**
 * Synchronous inline script for `preference === 'system'`.
 * Runs before paint so the first frame uses the correct `data-theme` (light | dark from OS).
 */
export function ThemeScript() {
  const inline = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');document.documentElement.dataset.theme=m.matches?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

  return (
    <script
      // Next.js may move scripts; keep in layout <head> as first child for earliest execution.
      // suppressHydrationWarning: extensions (e.g. Hive Keychain) may rewrite <script> nodes before React hydrates.
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: inline }}
    />
  );
}
