import type { ReactNode } from 'react';

/**
 * Full post pages: centered column, no profile hero or profile rails.
 */
export default function ArticleGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-container-narrow px-gutter py-section-y-sm sm:px-gutter-sm">
      {children}
    </div>
  );
}
