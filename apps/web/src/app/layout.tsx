import './global.css';

import type { Metadata } from 'next';

import { isRTL } from '../i18n/domain/is-rtl';
import { I18nProvider } from '../i18n/providers/i18n-provider';
import { getRequestLocale } from '../i18n/runtime/get-request-locale';
import { loadMessages } from '../i18n/runtime/load-messages';
import { env } from '@/config/env';
import { getNotificationsWsPublicUrl } from '@/config/get-notifications-ws-public-url';
import { OdlNetworkProvider } from '@/config/odl-network-provider';
import { NotificationsWsConfigProvider } from '@/modules/notifications/presentation/notifications-ws-config-provider';
import { ShellModeProvider } from '@/shell-mode';
import { getServerShellModeResolution } from '@/shell-mode/server';
import { getServerThemeResolution } from '../theme/get-server-theme-resolution';
import { ThemeProvider } from '../theme/theme-provider';

const SITE_NAME = 'Waivio';
const SITE_DESCRIPTION =
  'Discover, organize, and earn rewards on the Hive blockchain.';

export const metadata: Metadata = {
  metadataBase: env.publicOrigin ? new URL(`${env.publicOrigin}/`) : undefined,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const themeResolution = await getServerThemeResolution();
  const shellModeResolution = await getServerShellModeResolution();
  const notificationsWsUrl = getNotificationsWsPublicUrl();

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      data-theme={themeResolution.resolvedTheme}
      data-shell-mode={shellModeResolution.resolvedMode}
    >
      <body className="min-h-screen bg-bg text-fg antialiased">
        <ThemeProvider initialResolution={themeResolution}>
          <ShellModeProvider initialResolution={shellModeResolution}>
            <OdlNetworkProvider customJsonId={env.odlCustomJsonId}>
              <NotificationsWsConfigProvider wsUrl={notificationsWsUrl}>
                <I18nProvider locale={locale} messages={messages}>
                  {children}
                </I18nProvider>
              </NotificationsWsConfigProvider>
            </OdlNetworkProvider>
          </ShellModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
