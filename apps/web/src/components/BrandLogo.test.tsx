// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BrandLogo } from './BrandLogo';

afterEach(cleanup);

describe('BrandLogo (header brand mark)', () => {
  it('renders the self-hosted logo image with an accessible name', () => {
    const { getByAltText } = render(<BrandLogo />);
    const img = getByAltText('Singha Auctions');
    expect(img.tagName).toBe('IMG');
    // Own-origin asset (satisfies CSP `img-src 'self'`) — never an external hotlink.
    expect(img.getAttribute('src')).toBe('/images/singha-logo.svg');
    expect(img.getAttribute('src')).not.toMatch(/^https?:\/\//);
  });

  it('accepts a size-override className', () => {
    const { getByAltText } = render(<BrandLogo className="h-8 w-auto" />);
    expect(getByAltText('Singha Auctions').className).toContain('h-8');
  });
});
