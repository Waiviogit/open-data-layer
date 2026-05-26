import type { Metadata } from 'next';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';
import { buildHomeMetadata } from '@/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  return buildHomeMetadata({ locale, messages });
}

export default function Index() {
  return (
    <main className="mx-auto max-w-container-page px-gutter py-section-y sm:px-gutter-sm">
      <h1 className="mb-4 font-display text-display text-heading">Welcome</h1>
      <p className="text-body text-muted">
        Home page placeholder — replace with your content.
      </p>
    </main>
  );
}
