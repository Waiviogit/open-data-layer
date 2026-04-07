import { buildCardGridClassName } from './card-grid-classname';

describe('buildCardGridClassName', () => {
  it('includes base and responsive column classes', () => {
    const c = buildCardGridClassName({ base: 1, sm: 2, lg: 3 });
    expect(c).toContain('grid gap-card-padding');
    expect(c).toContain('grid-cols-1');
    expect(c).toContain('sm:grid-cols-2');
    expect(c).toContain('lg:grid-cols-3');
  });

  it('supports all breakpoints', () => {
    const c = buildCardGridClassName({
      base: 2,
      sm: 3,
      md: 4,
      lg: 5,
      xl: 6,
    });
    expect(c).toContain('grid-cols-2');
    expect(c).toContain('sm:grid-cols-3');
    expect(c).toContain('md:grid-cols-4');
    expect(c).toContain('lg:grid-cols-5');
    expect(c).toContain('xl:grid-cols-6');
  });

  it('appends extra className', () => {
    const c = buildCardGridClassName({ base: 1 }, 'min-h-0');
    expect(c.endsWith('min-h-0')).toBe(true);
  });
});
