type RightSidebarProps = {
  accountName: string;
};

export function RightSidebar({ accountName }: RightSidebarProps) {
  return (
    <aside
      className="rounded-card border border-border bg-surface/60 p-4 text-sm text-muted"
      aria-label="Profile sidebar"
    >
      <p className="font-medium text-fg">About @{accountName}</p>
      <p className="mt-2 text-muted">
        Placeholder — keyed by user name in legacy app.
      </p>
    </aside>
  );
}
