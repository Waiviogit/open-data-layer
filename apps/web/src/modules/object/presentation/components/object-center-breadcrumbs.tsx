'use client';

export type ObjectCenterBreadcrumbsProps = {
  rootName: string;
  stack: Array<{ objectId: string; name: string }>;
  onNavigateTo: (depth: number) => void;
};

/**
 * Center-column breadcrumb trail for nested list/page navigation.
 * `depth` -1 = root object; 0..N = stack index inclusive.
 */
export function ObjectCenterBreadcrumbs({
  rootName,
  stack,
  onNavigateTo,
}: ObjectCenterBreadcrumbsProps) {
  if (stack.length === 0) {
    return null;
  }

  const segments: Array<{ label: string; depth: number }> = [
    { label: rootName, depth: -1 },
    ...stack.map((entry, index) => ({ label: entry.name, depth: index })),
  ];

  return (
    <nav
      aria-label="Object path"
      className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted"
    >
      {segments.map((seg, index) => (
        <span key={`${seg.depth}-${seg.label}`} className="inline-flex min-w-0 items-center gap-1">
          {index > 0 ? <span aria-hidden className="text-border">/</span> : null}
          {index === segments.length - 1 ? (
            <span className="truncate font-medium text-fg">{seg.label}</span>
          ) : (
            <button
              type="button"
              className="truncate text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={() => onNavigateTo(seg.depth)}
            >
              {seg.label}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
