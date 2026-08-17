import { describe, expect, it } from 'vitest';
import { mediaUrl } from './media';

describe('mediaUrl', () => {
  it('returns null for empty input', () => {
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl(undefined)).toBeNull();
    expect(mediaUrl('')).toBeNull();
  });

  it('passes absolute URLs and data/blob URIs through untouched', () => {
    expect(mediaUrl('https://cdn.example/x.jpg')).toBe('https://cdn.example/x.jpg');
    expect(mediaUrl('http://localhost:3000/demo/smkt/vehicles/smkt-veh-01-1.svg')).toBe(
      'http://localhost:3000/demo/smkt/vehicles/smkt-veh-01-1.svg',
    );
    expect(mediaUrl('data:image/svg+xml,<svg/>')).toBe('data:image/svg+xml,<svg/>');
  });

  it('serves the self-hosted demo namespace same-origin (no object storage needed)', () => {
    expect(mediaUrl('demo/smkt/gems/smkt-gem-01-1.svg')).toBe('/demo/smkt/gems/smkt-gem-01-1.svg');
    expect(mediaUrl('/demo/smkt/gems/smkt-gem-01-1.svg')).toBe('/demo/smkt/gems/smkt-gem-01-1.svg');
  });
});
