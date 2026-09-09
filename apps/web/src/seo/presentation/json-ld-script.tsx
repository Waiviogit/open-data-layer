import 'server-only';

import { serializeJsonLd } from '../domain/serialize-json-ld';

type JsonLdScriptProps = {
  data: Record<string, unknown> | null | undefined;
};

export function JsonLdScript({ data }: JsonLdScriptProps) {
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
