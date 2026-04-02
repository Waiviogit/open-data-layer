type LeftSidebarProps = {
  title?: string;
};

export function LeftSidebar({ title = 'Discover' }: LeftSidebarProps) {
  return (
    <aside
      className="rounded-card border border-border bg-surface/60 p-4 text-sm text-muted"
      aria-label={title}
    >
      <p className="font-medium text-fg">{title}</p>
      <p className="mt-2 text-muted">
        Placeholder widget area — wire to global shell state.
      </p>
    </aside>
  );
}
