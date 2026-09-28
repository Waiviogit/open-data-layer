import './global.css';

import type { Metadata } from 'next';

import { isRTL } from '@/i18n/domain/is-rtl';
import { I18nProvider } from '@/i18n/providers/i18n-provider';
import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';
import { env } from '@/config/env';
import { getHiveTxExplorerBaseUrl } from '@/config/get-hive-tx-explorer-base-url';
import { getIpfsContentBaseUrl } from '@/config/get-ipfs-content-base-url';
import { getNotificationsWsPublicUrl } from '@/config/get-notifications-ws-public-url';
import { HiveTxExplorerProvider } from '@/config/hive-tx-explorer-provider';
import { IpfsContentBaseProvider } from '@/config/ipfs-content-base-provider';
import { HasConfigProvider } from '@/config/has-config-provider';
import { HasSignWaitProvider } from '@/modules/auth/presentation/components/has-sign-wait-provider';
import { OdlNetworkProvider } from '@/config/odl-network-provider';
import { NotificationsWsConfigProvider } from '@/modules/notifications/presentation/notifications-ws-config-provider';
import { ShellModeProvider } from '@/shell-mode';
import { getServerShellModeResolution } from '@/shell-mode/server';
import { getServerThemeResolution } from '@/theme/get-server-theme-resolution';
import { ThemeProvider } from '@/theme/theme-provider';

const SITE_NAME = 'Waivio';
const SITE_DESCRIPTION =
  'Discover, organize, and earn rewards on the Hive blockchain.';

export const viewport = {
  viewportFit: 'cover',
} as const;

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
  const ipfsContentBaseUrl = getIpfsContentBaseUrl();
  const hiveTxExplorerBaseUrl = getHiveTxExplorerBaseUrl();

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      data-theme={themeResolution.resolvedTheme}
      data-shell-mode={shellModeResolution.resolvedMode}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-screen bg-bg text-fg antialiased">
        <ThemeProvider initialResolution={themeResolution}>
          <ShellModeProvider initialResolution={shellModeResolution}>
            <HasConfigProvider wsUrl={env.hasWsUrl} appName={env.hasAppName}>
              <OdlNetworkProvider
                customJsonId={env.odlCustomJsonId}
                oblCustomJsonId={env.oblCustomJsonId}
                oslCustomJsonId={env.oslCustomJsonId}
              >
                <IpfsContentBaseProvider contentBaseUrl={ipfsContentBaseUrl}>
                  <HiveTxExplorerProvider baseUrl={hiveTxExplorerBaseUrl}>
                    <NotificationsWsConfigProvider wsUrl={notificationsWsUrl}>
                      <I18nProvider locale={locale} messages={messages}>
                        <HasSignWaitProvider />
                        {children}
                      </I18nProvider>
                    </NotificationsWsConfigProvider>
                  </HiveTxExplorerProvider>
                </IpfsContentBaseProvider>
              </OdlNetworkProvider>
            </HasConfigProvider>
          </ShellModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
