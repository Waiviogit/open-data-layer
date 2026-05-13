import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getRequestLocale } from '@/i18n/runtime/get-request-locale';
import { loadMessages } from '@/i18n/runtime/load-messages';

import { loadObjectPageModel } from './object-page-model.server';
import { ObjectPageClient } from './object-page-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'object-id': string }>;
}): Promise<Metadata> {
  const { 'object-id': rawId } = await params;
  const objectId = decodeURIComponent(rawId);
  const locale = await getRequestLocale();
  const messages = await loadMessages(locale);
  const label =
    typeof messages.object === 'string' ? messages.object : 'object';

  const model = await loadObjectPageModel(objectId, locale);
  const title = model?.title ?? objectId;

  return {
    title: `${title} · ${label}`,
  };
}

export default async function ObjectDetailPage({
  params,
}: {
  params: Promise<{ 'object-id': string }>;
}) {
  const { 'object-id': rawId } = await params;
  const objectId = decodeURIComponent(rawId);
  const locale = await getRequestLocale();
  const model = await loadObjectPageModel(objectId, locale);

  if (!model) {
    notFound();
  }

  return <ObjectPageClient model={model} />;
}
