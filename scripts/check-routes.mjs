#!/usr/bin/env node
/**
 * Internal route/link check (pack 01 doc 10/11 — no production primary-nav link
 * may 404). Scans the Header/Footer for internal hrefs and asserts each resolves
 * to a real Next.js App Router route under apps/web/src/app. External links
 * (http/mailto/tel) and dynamic anchors (#) are ignored.
 *
 * Exit non-zero on any dead internal link so CI blocks the merge.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(root, 'apps/web/src/app');
const navFiles = ['apps/web/src/components/Header.tsx', 'apps/web/src/components/Footer.tsx'];

/** Collect every route path that has a page.tsx (static + dynamic segments). */
function collectRoutes(dir, prefix = '') {
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) {
      if (entry === 'page.tsx' || entry === 'page.jsx') routes.push(prefix || '/');
      continue;
    }
    // Route groups (parentheses) don't add a path segment.
    const seg = entry.startsWith('(') && entry.endsWith(')') ? '' : `/${entry}`;
    routes.push(...collectRoutes(full, prefix + seg));
  }
  return routes;
}

const routes = collectRoutes(appDir);

/** Does an internal href match a static or dynamic ([id]) route? */
function matches(href) {
  const path = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  for (const route of routes) {
    const rx = new RegExp('^' + route.replace(/\[[^/]+\]/g, '[^/]+') + '$');
    if (rx.test(path)) return true;
  }
  return false;
}

let dead = 0;
for (const rel of navFiles) {
  const file = join(root, rel);
  if (!existsSync(file)) continue;
  const src = readFileSync(file, 'utf8');
  // Match both JSX `href="/x"` and nav-config object-literal `href: '/x'` forms
  // (the nav items live in an array of { href, label } objects).
  const hrefs = [...src.matchAll(/href(?:=|:\s*)["'](\/[^"'{}]*)["']/g)].map((m) => m[1]);
  for (const href of [...new Set(hrefs)]) {
    if (matches(href)) {
      console.log(`  ✓ ${rel}  ${href}`);
    } else {
      console.error(`  ✗ ${rel}  ${href}  → no matching route`);
      dead += 1;
    }
  }
}

if (dead > 0) {
  console.error(`\n${dead} dead internal nav link(s). Every primary-nav link must resolve.`);
  process.exit(1);
}
console.log('\nAll internal nav links resolve to real routes.');
