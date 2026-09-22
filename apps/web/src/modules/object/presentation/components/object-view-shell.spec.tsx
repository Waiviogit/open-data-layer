/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

jest.mock('@/shared/presentation/layout', () => ({
  StickyRegion: ({ children }: { children: unknown }) => children,
  FixedRegion: ({ children }: { children: unknown }) => children,
}));

import { ObjectViewShell } from './object-view-shell';

describe('ObjectViewShell mobile stack', () => {
  const leftRail = <div data-testid="left-rail">Details rail</div>;
  const center = <div data-testid="center-content">Center</div>;
  const rightRail = <div data-testid="right-rail">Related</div>;
  const social = <div data-testid="social-stack">Social</div>;

  it('standardView orders Details, social, and hidden center below lg', () => {
    const { container } = render(
      <ObjectViewShell
        hero={<div>Hero</div>}
        leftRail={leftRail}
        center={center}
        rightRail={rightRail}
        mobileLayout="standardView"
        mobileSocialSlot={social}
      />,
    );

    const main = container.querySelector('main')!;
    const mainChildren = [...main.children];
    expect(mainChildren[0]).toHaveAttribute('data-testid', 'object-mobile-left-rail');
    expect(mainChildren[1]).toHaveAttribute('data-testid', 'object-mobile-social');
    expect(mainChildren[2]).toHaveAttribute('data-testid', 'object-center-column');
    expect(mainChildren[2]).toHaveClass('hidden', 'lg:block');
    expect(screen.getByTestId('object-mobile-left-rail')).toHaveClass('lg:hidden');
  });

  it('standardEdit shows Details only and hides social plus center below lg', () => {
    render(
      <ObjectViewShell
        hero={<div>Hero</div>}
        leftRail={leftRail}
        center={center}
        rightRail={rightRail}
        mobileLayout="standardEdit"
        mobileSocialSlot={social}
      />,
    );

    expect(screen.getByTestId('object-mobile-left-rail')).toBeInTheDocument();
    expect(screen.queryByTestId('object-mobile-social')).not.toBeInTheDocument();
    expect(screen.getByTestId('object-center-column')).toHaveClass('hidden', 'lg:block');
  });

  it('specialEdit shows center then Details below lg', () => {
    const { container } = render(
      <ObjectViewShell
        hero={<div>Hero</div>}
        leftRail={leftRail}
        center={center}
        rightRail={rightRail}
        mobileLayout="specialEdit"
      />,
    );

    const main = container.querySelector('main')!;
    const mainChildren = [...main.children];
    expect(mainChildren[0]).toHaveAttribute('data-testid', 'object-center-column');
    expect(mainChildren[0]).not.toHaveClass('hidden');
    expect(mainChildren[1]).toHaveAttribute('data-testid', 'object-mobile-left-rail');
    expect(screen.queryByTestId('object-mobile-social')).not.toBeInTheDocument();
  });

  it('centerOnly does not inject mobile Details or social', () => {
    render(
      <ObjectViewShell
        hero={<div>Hero</div>}
        leftRail={leftRail}
        center={center}
        rightRail={rightRail}
        mobileLayout="centerOnly"
        mobileSocialSlot={social}
      />,
    );

    expect(screen.queryByTestId('object-mobile-left-rail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('object-mobile-social')).not.toBeInTheDocument();
    expect(screen.getByTestId('object-center-column')).not.toHaveClass('hidden');
  });

  it('standardView shows the right rail below lg', () => {
    render(
      <ObjectViewShell
        hero={<div>Hero</div>}
        leftRail={leftRail}
        center={center}
        rightRail={rightRail}
        mobileLayout="standardView"
        mobileSocialSlot={social}
      />,
    );

    const rightColumn = screen.getByTestId('object-right-rail-column');
    expect(rightColumn).not.toHaveClass('hidden');
    expect(rightColumn).toHaveClass('min-w-0');
    expect(screen.getByTestId('right-rail').closest('.hidden')).toBeNull();
  });

  it('keeps the desktop left rail hidden below lg on standardView', () => {
    const { container } = render(
      <ObjectViewShell
        hero={<div>Hero</div>}
        leftRail={leftRail}
        center={center}
        rightRail={rightRail}
        mobileLayout="standardView"
        mobileSocialSlot={social}
      />,
    );

    const grid = container.querySelector('.shell-object-page-grid')!;
    expect(grid.children[0]).toHaveClass('hidden', 'lg:block');
  });

  it('hides the right rail below lg outside standardView', () => {
    const { rerender } = render(
      <ObjectViewShell
        hero={<div>Hero</div>}
        leftRail={leftRail}
        center={center}
        rightRail={rightRail}
        mobileLayout="centerOnly"
        mobileSocialSlot={social}
      />,
    );

    expect(screen.getByTestId('object-right-rail-column')).toHaveClass(
      'hidden',
      'lg:block',
    );

    rerender(
      <ObjectViewShell
        hero={<div>Hero</div>}
        leftRail={leftRail}
        center={center}
        rightRail={rightRail}
        mobileLayout="standardEdit"
        mobileSocialSlot={social}
      />,
    );

    expect(screen.getByTestId('object-right-rail-column')).toHaveClass(
      'hidden',
      'lg:block',
    );
  });

  it('mobile Details copies include Instagram rail hide', () => {
    render(
      <ObjectViewShell
        hero={<div>Hero</div>}
        leftRail={leftRail}
        center={center}
        rightRail={rightRail}
        mobileLayout="standardView"
        mobileSocialSlot={social}
      />,
    );

    expect(screen.getByTestId('object-mobile-left-rail')).toHaveClass(
      'shell-hide-instagram',
    );
  });
});
