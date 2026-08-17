/** Authoritative-backend helpers: call the real API and verify DB/state after browser actions. */
import { execFileSync } from 'node:child_process';
import { API_V1, API_V2 } from '../config.mjs';

/** Low-level JSON request against the API with an optional bearer token. */
export async function api(method, urlOrPath, { token, body, base = API_V1 } = {}) {
  const url = /^https?:/.test(urlOrPath) ? urlOrPath : `${base}${urlOrPath}`;
  const res = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 500) };
  }
  return { status: res.status, ok: res.ok, json };
}

export const apiV2 = (method, p, opts = {}) => api(method, p, { ...opts, base: API_V2 });

/** Mint a principal dev token for a synthetic persona (local/preview only). */
export async function devToken({ email, customerId, roles = ['customer'], aal = 'aal2' }) {
  const { status, json } = await api('POST', '/dev/token', {
    body: { email, customerId, roles, aal },
  });
  if (status !== 201 && status !== 200)
    throw new Error(`dev/token failed (${status}): ${JSON.stringify(json)}`);
  return json.token;
}

/**
 * Verify authoritative DB state (local pilot only — needs psql access to the preview DB).
 * Returns rows as an array of tab-joined strings. Read-only.
 */
export function dbQuery(sql, { port = 5433, db = 'singha_preview' } = {}) {
  const bin = process.env.PILOT_PGBIN || '/usr/lib/postgresql/16/bin/psql';
  try {
    const out = execFileSync(
      'su',
      [
        '-s',
        '/bin/bash',
        'postgres',
        '-c',
        `${bin} -p ${port} -d ${db} -tAF'\t' -c ${JSON.stringify(sql)}`,
      ],
      { encoding: 'utf8' },
    );
    return out.trim() ? out.trim().split('\n') : [];
  } catch (e) {
    return [`DBERR: ${String(e.message || e).slice(0, 160)}`];
  }
}

export { API_V1, API_V2 };
