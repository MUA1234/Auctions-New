// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { LotStickyDock } from './LotStickyDock';

const h = vi.hoisted(() => ({ flags: { neutralIaV1: false } as Record<string, boolean> }));
vi.mock('../lib/use-flags', () => ({ useFlags: () => ({ flags: h.flags, loading: false }) }));

afterEach(cleanup);

describe('LotStickyDock', () => {
  it('uses the EXPRESSION_OF_INTEREST CTA (matches the backend SaleMethod enum)', () => {
    h.flags = { neutralIaV1: false };
    const { getByText } = render(
      <LotStickyDock priceMinor={null} currency="LKR" saleMethod="EXPRESSION_OF_INTEREST" />,
    );
    expect(getByText('Register interest')).toBeTruthy();
  });

  it('sits at the screen edge when the mobile nav dock is off', () => {
    h.flags = { neutralIaV1: false };
    const { container } = render(
      <LotStickyDock priceMinor={100} currency="LKR" saleMethod="BUY_NOW" />,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain('bottom-0');
  });

  it('offsets above the mobile nav dock when neutral IA is on (prevents the two docks colliding)', () => {
    h.flags = { neutralIaV1: true };
    const { container } = render(
      <LotStickyDock priceMinor={100} currency="LKR" saleMethod="BUY_NOW" />,
    );
    const cls = (container.firstElementChild as HTMLElement).className;
    expect(cls).toContain('bottom-[calc(3.75rem');
    expect(cls).toContain('md:bottom-0');
  });
});
