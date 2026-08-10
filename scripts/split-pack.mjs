#!/usr/bin/env node
/**
 * Splits the combined AI Development Pack markdown into the canonical repo docs:
 * the root `CLAUDE.md` and the individual `docs/NN_*.md` files.
 *
 * The combined file delimits sections with lines of the form:
 *     # FILE: `CLAUDE.md`
 *     # FILE: `docs/00_READ_ME_FIRST.md`
 *
 * Usage: node scripts/split-pack.mjs <path-to-combined.md>
 *
 * This is idempotent — re-running regenerates the same files. It is kept in the
 * repo so the canonical instructions can always be re-derived from the pack.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/split-pack.mjs <path-to-combined.md>');
  process.exit(1);
}

// fileURLToPath decodes URL escapes (e.g. spaces as %20) — the repo path
// contains a space ("Auctions New"), so a raw URL.pathname would be wrong.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const raw = readFileSync(src, 'utf8');
const lines = raw.split('\n');

const fileMarker = /^#\s+FILE:\s+`([^`]+)`\s*$/;
const sections = [];
let current = null;

for (const line of lines) {
  const m = line.match(fileMarker);
  if (m) {
    if (current) sections.push(current);
    current = { path: m[1], body: [] };
    continue;
  }
  if (current) current.body.push(line);
}
if (current) sections.push(current);

if (sections.length === 0) {
  console.error('No "# FILE:" markers found — is this the combined pack?');
  process.exit(1);
}

let written = 0;
for (const section of sections) {
  // Trim a leading blank line and any trailing "---" separator + blanks that
  // belonged to the section boundary in the combined file.
  let body = section.body;
  while (body.length && body[0].trim() === '') body = body.slice(1);
  while (
    body.length &&
    (body[body.length - 1].trim() === '' || body[body.length - 1].trim() === '---')
  ) {
    body = body.slice(0, -1);
  }
  const outPath = join(repoRoot, section.path);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, body.join('\n') + '\n', 'utf8');
  written += 1;
  console.log('wrote', section.path);
}

console.log(`\nSplit ${written} files from ${src}`);
