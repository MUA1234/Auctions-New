/**
 * Singha Synthetic Customer Pilot — orchestrator.
 *
 * Runs the registered journeys against the configured target, provisions synthetic personas,
 * captures evidence + verifies authoritative backend state, and emits a results matrix.
 *
 *   node apps/web/pilot/run.mjs [journeyId ...]     # all, or a subset
 *
 * Journey contract — each module in ./journeys/*.mjs default-exports:
 *   {
 *     id, title,
 *     async run(ctx) => {
 *       result: 'PASS'|'PARTIAL'|'FAIL'|'BLOCKED',
 *       steps: [{ name, ok, detail }],
 *       widths?: { [name]: { overflowPx, errors } },   // responsive evidence
 *       backendVerified?: boolean,
 *       securityVerified?: boolean,
 *       evidence?: [filepath],
 *       notes?: string,
 *     }
 *   }
 * ctx = { browser, api, apiV2, db, personas, fixtures, cfg, lib:{ visit, shot, shotViewport, personaContext, login }, log }
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as cfg from './config.mjs';
import { api, apiV2, dbQuery } from './lib/api.mjs';
import * as browserLib from './lib/browser.mjs';
import { login } from './lib/auth.mjs';
import { PERSONAS } from './personas.mjs';
import { ensureFixtures } from './fixtures.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN_DIR = path.join(cfg.OUT_DIR, cfg.RUN_ID);
fs.mkdirSync(RUN_DIR, { recursive: true });
const log = (...a) => console.log(`[pilot ${cfg.RUN_ID}]`, ...a);

async function loadJourneys(filter) {
  const dir = path.join(__dirname, 'journeys');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')) : [];
  const mods = [];
  for (const f of files) {
    const mod = (await import(pathToFileURL(path.join(dir, f)).href)).default;
    if (mod && (!filter.length || filter.includes(mod.id))) mods.push(mod);
  }
  return mods.sort((a, b) => a.id.localeCompare(b.id));
}

async function main() {
  const filter = process.argv.slice(2);
  log('target', cfg.BASE_URL, '/', cfg.API_URL);
  const safety = await cfg.assertSafeEnvironment();
  log(
    'safety OK — providers off:',
    JSON.stringify(safety.flags?.operatorPayments ?? '?'),
    'remote:',
    safety.remote,
  );

  const browser = await browserLib.launch();
  const fixtures = await ensureFixtures({ api, apiV2, db: dbQuery, personas: PERSONAS, cfg, log });
  const ctx = {
    browser,
    api,
    apiV2,
    db: dbQuery,
    personas: PERSONAS,
    fixtures,
    cfg,
    lib: { ...browserLib, login },
    log,
  };

  const journeys = await loadJourneys(filter);
  log('running', journeys.length, 'journeys:', journeys.map((j) => j.id).join(', '));
  const results = [];
  for (const j of journeys) {
    log('▶', j.id, j.title);
    let r;
    try {
      r = await j.run(ctx);
    } catch (e) {
      r = { result: 'FAIL', steps: [{ name: 'threw', ok: false, detail: String(e.message || e) }] };
    }
    results.push({ id: j.id, title: j.title, ...r });
    log('  =', r.result, '—', (r.steps || []).filter((s) => !s.ok).length, 'failed step(s)');
  }
  await browser.close();

  fs.writeFileSync(
    path.join(RUN_DIR, 'results.json'),
    JSON.stringify({ runId: cfg.RUN_ID, safety, results }, null, 2),
  );
  fs.writeFileSync(path.join(RUN_DIR, 'MATRIX.md'), renderMatrix(results));
  log('DONE — results in', RUN_DIR);
  console.log(renderMatrix(results));
}

function renderMatrix(results) {
  const yn = (b) => (b === true ? '✅' : b === false ? '❌' : '—');
  const lines = [
    `# Singha Synthetic Pilot — ${cfg.RUN_ID}`,
    '',
    '| Journey | Result | Backend verified | Security verified | Failed steps |',
    '|---|---|:--:|:--:|---|',
  ];
  for (const r of results) {
    const failed =
      (r.steps || [])
        .filter((s) => !s.ok)
        .map((s) => s.name)
        .join('; ') || '—';
    lines.push(
      `| ${r.title} | ${r.result} | ${yn(r.backendVerified)} | ${yn(r.securityVerified)} | ${failed} |`,
    );
  }
  return lines.join('\n') + '\n';
}

main().catch((e) => {
  console.error('PILOT FATAL', e);
  process.exit(1);
});
