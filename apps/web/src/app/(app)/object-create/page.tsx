import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';
import { ObjectCreateClient } from '@/modules/object-create';
import { generatePrefix } from '@/modules/object-create/domain/generate-object-id';
import { createCookieAuthContextProvider } from '@/shared/infrastructure/auth/cookie-auth-context-provider';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  return {
    title: messages.object_create_title ?? messages.create_object,
  };
}

export default async function ObjectCreatePage() {
  const auth = createCookieAuthContextProvider();
  const user = await auth.getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const initialObjectIdPrefix = generatePrefix();

  return (
    <ObjectCreateClient
      username={user.username}
      initialObjectIdPrefix={initialObjectIdPrefix}
    />
  );
}
