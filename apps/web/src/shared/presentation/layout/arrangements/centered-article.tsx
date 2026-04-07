import type { ReactNode } from 'react';

export type CenteredArticleProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Narrow centered column for long-form content (`max-w-container-content`).
 */
export function CenteredArticle({ children, className = '' }: CenteredArticleProps) {
  return (
    <article className={['mx-auto w-full max-w-container-content', className].join(' ')}>
      {children}
    </article>
  );
}
