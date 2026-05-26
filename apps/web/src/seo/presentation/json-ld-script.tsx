import 'server-only';

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
