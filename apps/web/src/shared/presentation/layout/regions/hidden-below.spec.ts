import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { HiddenBelow, hiddenBelowClassForBreakpoint } from './hidden-below';
import type { HiddenBelowBreakpoint } from './hidden-below';

describe('hiddenBelowClassForBreakpoint', () => {
  const cases: Array<[HiddenBelowBreakpoint, string]> = [
    ['sm', 'hidden sm:block'],
    ['md', 'hidden md:block'],
    ['lg', 'hidden lg:block'],
    ['xl', 'hidden xl:block'],
  ];

  it.each(cases)('maps %s to %s', (bp, expected) => {
    expect(hiddenBelowClassForBreakpoint[bp]).toBe(expected);
  });
});

describe('HiddenBelow', () => {
  it('applies breakpoint class to wrapper', () => {
    const html = renderToStaticMarkup(
      createElement(
        HiddenBelow,
        { breakpoint: 'md' },
        createElement('span', null, 'child'),
      ),
    );
    expect(html).toContain('hidden md:block');
    expect(html).toContain('child');
  });
});
