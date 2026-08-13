#!/usr/bin/env node
/**
 * Bundle secret scan (anti-clone retrofit doc 01 §6 / doc 06 `security:bundle`).
 * Fails CI if a server-only secret VALUE, or a server-secret env-var NAME, appears
 * in the BROWSER-served bundle (`.next/static`). The browser must never carry a
 * service key, the session/JWT secret or the database URL.
 *
 * Scope is deliberately the browser bundle only: server chunks and server source
 * maps (`.next/server`) are never shipped to the client and legitimately reference
 * env-var names / library JSDoc, so scanning them produces false positives. We
 * match real key VALUES (e.g. `sb_secret_<key>`) — not the Supabase library's
 * `startsWith("sb_secret_")` prefix guard. Public `NEXT_PUBLIC_*` values are fine.
 *
 * Run after `next build`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'apps/web/.next/static';

// Server-secret env-var NAMES that must never appear in browser code.
const FORBIDDEN_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_JWT_SECRET',
  'SESSION_SECRET',
  'JWT_SECRET',
  'DATABASE_URL',
  'DIRECT_URL',
];
// Real secret VALUE patterns (a genuine key, not a prefix guard literal).
const VALUE_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]{12,}/, // Supabase secret key value
  /"role"\s*:\s*"service_role"/, // a service_role JWT payload
  /postgres(?:ql)?:\/\/[^:]+:[^@]+@/, // a DB connection string with credentials
];

if (!existsSync(ROOT)) {
  console.error(`bundle scan: ${ROOT} not found — run \`next build\` first.`);
  process.exit(1);
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* files(p);
    // Only files the browser actually loads.
    else if (/\.(js|mjs|css)$/.test(name)) yield p;
  }
}

const hits = [];
for (const file of files(ROOT)) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const name of FORBIDDEN_NAMES) {
    if (text.includes(name)) hits.push({ file, what: name });
  }
  for (const re of VALUE_PATTERNS) {
    if (re.test(text)) hits.push({ file, what: re.source.slice(0, 40) });
  }
}

if (hits.length > 0) {
  console.error('✗ Server secret material found in the BROWSER bundle:');
  for (const { file, what } of hits) console.error(`  ${what}  →  ${file}`);
  console.error('\nA server secret must never reach the browser. Fix before release.');
  process.exit(1);
}

console.log(`✓ bundle scan clean — no server secrets in ${ROOT}`);
