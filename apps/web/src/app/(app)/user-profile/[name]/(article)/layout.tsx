import type { ReactNode } from 'react';

/**
 * Full post pages: centered column, no profile hero or profile rails.
 */
export default function ArticleGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-container-post px-6 py-section-y-sm sm:px-8">
      {children}
    </div>
  );
}
