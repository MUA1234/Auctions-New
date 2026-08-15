// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Singha Evolution language guard (E1, pack docs 04/11/36). Customer-facing copy should read as
 * "Singha" / "Singha Exchange" and reserve "Auction" for genuine auction mechanics — the platform
 * is international by architecture, not by shouting "Global". This test scans the customer-facing
 * source (app routes + shared components) and fails if a banned marketing phrase reappears, so the
 * rebrand can't silently regress. It intentionally does NOT ban the bare word "auction" (correct
 * for real auctions) or dev comments like "Global 404".
 */

const here = dirname(fileURLToPath(import.meta.url));
const SCAN_DIRS = [join(here, '..', 'app'), join(here, '..', 'components')];
const SRC_ROOT = join(here, '..');

// Phrases that must not appear in customer-facing source (case-insensitive).
const BANNED: { phrase: string; why: string }[] = [
  { phrase: 'Global Marketplace', why: 'international by architecture, not by label (pack 04)' },
  { phrase: 'Singha Global', why: 'master brand is "Singha", no "Global" suffix (pack 01 §1)' },
  { phrase: 'Global Auction', why: 'auction is one method, not the platform framing (pack 02)' },
  { phrase: 'Auction Account', why: '"Auction" only for real auction mechanics (pack 01 §2)' },
  { phrase: 'Auction Shipping', why: '"Auction" only for real auction mechanics (pack 01 §2)' },
  { phrase: 'Auction Catalogue', why: '"Auction" only for real auction mechanics (pack 01 §2)' },
  { phrase: 'Worldwide', why: 'geography-neutral tone, avoid worldwide/global (pack 04)' },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(tsx?|mdx?)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('customer-facing language glossary', () => {
  const files = SCAN_DIRS.flatMap(walk);

  it('scans a non-trivial set of source files', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const { phrase, why } of BANNED) {
    it(`does not use "${phrase}" (${why})`, () => {
      const needle = phrase.toLowerCase();
      const hits = files
        .filter((f) => readFileSync(f, 'utf8').toLowerCase().includes(needle))
        .map((f) => relative(SRC_ROOT, f));
      expect(hits, `Banned phrase "${phrase}" found in: ${hits.join(', ')}`).toEqual([]);
    });
  }
});
