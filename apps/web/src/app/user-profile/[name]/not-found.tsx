import Link from 'next/link';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';

export default async function UserProfileNotFound() {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  const t = (key: string) => messages[key] ?? key;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-fg">{t('user_profile_not_found_title')}</h1>
      <p className="mt-2 text-muted">{t('user_profile_not_found_body')}</p>
      <Link href="/" className="mt-6 inline-block text-accent hover:underline">
        {t('user_profile_back_home')}
      </Link>
    </div>
  );
}
