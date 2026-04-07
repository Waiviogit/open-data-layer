import Link from 'next/link';
import type { ReactNode } from 'react';

export type NavMenuItem = {
  label: string;
  href: string;
  icon?: ReactNode;
};

export type NavMenuProps = {
  items: NavMenuItem[];
  /** Accessible label for the nav landmark */
  ariaLabel?: string;
  className?: string;
};

/**
 * Vertical nav list for narrow app rails (e.g. Twitter-style shell mode).
 * Icon-first: labels are `sr-only` + `title` for tooltips when horizontal space is tight.
 */
export function NavMenu({
  items,
  ariaLabel = 'Section navigation',
  className = '',
}: NavMenuProps) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className="flex flex-col gap-0.5 p-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              title={item.label}
              className={[
                'flex items-center justify-center rounded-btn px-1 py-2 text-fg transition-colors',
                'hover:bg-surface-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
              ].join(' ')}
            >
              {item.icon ? (
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-fg"
                  aria-hidden
                >
                  {item.icon}
                </span>
              ) : null}
              <span className="sr-only">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
