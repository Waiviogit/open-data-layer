import type { ReactNode } from 'react';

export type LeftObjectProfileSidebarProps = {
  children: ReactNode;
};

/** Thin wrapper around left rail content (about panel). */
export function LeftObjectProfileSidebar({ children }: LeftObjectProfileSidebarProps) {
  return <aside className="min-w-0">{children}</aside>;
}
