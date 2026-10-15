/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react';

import { WalletSummaryHeader } from './wallet-summary-header';

describe('WalletSummaryHeader', () => {
  it('uses bg-accent-soft for WAIV tone', () => {
    const { container } = render(
      <WalletSummaryHeader
        title="WAIV"
        subtitle="Wallet"
        estAccountValueLabel="Est."
        estAccountValue="$1"
        tone="waiv"
      />,
    );

    expect(container.firstElementChild?.className).toContain('bg-accent-soft');
    expect(container.firstElementChild?.className).not.toContain('color-mix');
  });
});
