import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppShell, gridClassForSlots } from './app-shell';

describe('gridClassForSlots', () => {
  it('returns three-column template when both rails present', () => {
    expect(gridClassForSlots(true, true)).toContain(
      'minmax(0,var(--shell-left-width))',
    );
    expect(gridClassForSlots(true, true)).toContain(
      'minmax(0,var(--shell-right-width))',
    );
  });

  it('returns two columns when only left rail', () => {
    const c = gridClassForSlots(true, false);
    expect(c).toContain(
      'lg:grid-cols-[minmax(0,var(--shell-left-width))_minmax(0,1fr)]',
    );
  });

  it('returns two columns when only right rail', () => {
    const c = gridClassForSlots(false, true);
    expect(c).toContain(
      'lg:grid-cols-[minmax(0,1fr)_minmax(0,var(--shell-right-width))]',
    );
  });

  it('returns single column when no rails', () => {
    expect(gridClassForSlots(false, false)).toBe('lg:grid-cols-1');
  });
});

describe('AppShell', () => {
  it('renders main area without optional slots', () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, null, createElement('span', null, 'main')),
    );
    expect(html).toContain('main');
    expect(html).toContain('lg:grid-cols-1');
  });

  it('renders left and right slots when provided', () => {
    const html = renderToStaticMarkup(
      createElement(
        AppShell,
        {
          leftNav: createElement('aside', null, 'left'),
          rightRail: createElement('aside', null, 'right'),
        },
        createElement('main', null, 'content'),
      ),
    );
    expect(html).toContain('left');
    expect(html).toContain('right');
    expect(html).toContain('content');
  });
});
