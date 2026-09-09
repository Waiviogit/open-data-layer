'use client';

import type { ReactNode } from 'react';

import { useI18n } from '@/i18n/providers/i18n-provider';
import { safeHttpUrl } from '@/shared/domain/safe-http-url';

import type { ProjectedWidgetConfigView } from '../../domain/object-page.types';
import { WIDGET_EMBED_SANDBOX } from '../../domain/widget-embed.constants';
import {
  WIDGET_COLUMN_FORWARD,
  WIDGET_COLUMN_NEW_TAB,
  WIDGET_EMBED_TYPE_WIDGET,
} from '../../domain/widget.constants';

export type ObjectWidgetContentProps = {
  config: ProjectedWidgetConfigView | null;
  /** Optional breadcrumb row above embed (nested `?path=` context). */
  breadcrumbs?: ReactNode;
};

function WidgetSandboxIframe({
  src,
  srcDoc,
  title,
}: {
  src?: string;
  srcDoc?: string;
  title: string;
}) {
  return (
    <iframe
      src={src}
      srcDoc={srcDoc}
      title={title}
      sandbox={WIDGET_EMBED_SANDBOX}
      className="min-h-[60vh] w-full border-0"
    />
  );
}

/**
 * Renders widget embed content (legacy `WidgetPage.js` parity).
 *
 * On-chain widget HTML/URLs are treated as untrusted: always sandboxed iframes
 * without allow-same-origin; never injected into the parent document.
 */
export function ObjectWidgetContent({ config, breadcrumbs }: ObjectWidgetContentProps) {
  const { t } = useI18n();

  if (!config) {
    return (
      <div className="rounded-card border border-border bg-surface/60 p-card-padding text-body-sm text-muted">
        {breadcrumbs}
        <p className="text-fg">{t('object_widget_empty')}</p>
      </div>
    );
  }

  const isNewTab = config.column === WIDGET_COLUMN_NEW_TAB;
  const isForward = config.column === WIDGET_COLUMN_FORWARD;
  const iframeTitle = config.title ?? 'Widget';
  const safeLink = safeHttpUrl(config.content);

  if (isNewTab || isForward) {
    return (
      <div className="rounded-card border border-border bg-surface/60 p-card-padding text-body-sm text-muted">
        {breadcrumbs}
        <p className="text-fg">
          {isNewTab ? t('object_widget_opens_new_tab') : t('object_widget_opens_same_tab')}{' '}
          {safeLink ? (
            <a
              href={safeLink}
              target={isNewTab ? '_blank' : '_self'}
              rel={isNewTab ? 'noopener noreferrer' : undefined}
              className="text-link underline"
            >
              {t('object_widget_continue_link')}
            </a>
          ) : (
            <span className="text-muted">{t('object_widget_continue_link')}</span>
          )}
        </p>
      </div>
    );
  }

  const hasInlineIframe = config.content.includes('<iframe');
  const looksLikeHtml =
    hasInlineIframe ||
    config.type === WIDGET_EMBED_TYPE_WIDGET ||
    config.content.trimStart().startsWith('<');

  if (looksLikeHtml) {
    return (
      <div className="min-h-[60vh] w-full">
        {breadcrumbs}
        <WidgetSandboxIframe srcDoc={config.content} title={iframeTitle} />
      </div>
    );
  }

  if (safeLink) {
    return (
      <div className="min-h-[60vh] w-full">
        {breadcrumbs}
        <WidgetSandboxIframe src={safeLink} title={iframeTitle} />
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface/60 p-card-padding text-body-sm text-muted">
      {breadcrumbs}
      <p className="text-fg">{t('object_widget_empty')}</p>
    </div>
  );
}
