#!/usr/bin/env node
/**
 * SINGHA — demo-media generator (pluggable, provider-neutral, OSS-first, replaceable).
 *
 * Produces coherent, same-item image sets for the realistic marketplace demo dataset, driven by
 * `demo-media.manifest.json` (emitted from the seeded data). Two backends:
 *
 *   --provider=svg     (default) deterministic, credential-free procedural SVG — no network, no
 *                      cost, license-clean (self-generated/CC0). The fallback that always works.
 *   --provider=openai  REAL photorealistic images via the OpenAI Images API (gpt-image-1). Needs
 *                      OPENAI_API_KEY and outbound network to api.openai.com. Per-listing prompts
 *                      are built from the item's title/category/condition/colour so the four views
 *                      depict the SAME item (text-to-image cannot pixel-lock multi-view identity —
 *                      a real photo set or an img2img/IP-Adapter pass is the higher-fidelity path;
 *                      see SINGHA_OSS_DECISIONS.md).
 *
 * Files are written to `public/demo/smkt/<category>/<ref>-<n>.<ext>` — the exact paths the backend
 * seeder references (seed with the matching DEMO_MEDIA_EXT: `svg` here, `png` for OpenAI).
 *
 * Usage:
 *   node apps/web/scripts/gen-demo-media.mjs                        # SVG fallback (default)
 *   OPENAI_API_KEY=… node apps/web/scripts/gen-demo-media.mjs --provider=openai [--views=4]
 *        [--quality=low|medium|high] [--size=1536x1024] [--limit=N] [--only=SMKT-VEH-01] [--dry-run]
 *
 * NOTE: --provider=openai cannot run inside a restricted sandbox where api.openai.com is
 * unreachable; run it on a machine/CI with network + the key. --dry-run prints the prompts only.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'public', 'demo', 'smkt');
const MANIFEST = join(HERE, 'demo-media.manifest.json');

// --- args -------------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  }),
);
const PROVIDER = args.provider ?? 'svg';
const VIEWS = args.views ? Math.max(1, Number(args.views)) : 4;
const QUALITY = args.quality ?? 'medium';
const SIZE = args.size ?? '1536x1024';
const LIMIT = args.limit ? Number(args.limit) : Infinity;
const ONLY = args.only ? String(args.only).toUpperCase() : null;
const DRY = Boolean(args['dry-run']);
const EMIT = Boolean(args['emit-prompts']); // write a human ChatGPT prompt sheet instead of images

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const cat3 = (c) => c.slice(0, 3).toUpperCase();

// FNV-1a — deterministic per-item colour selection.
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const COLOUR_HEX = {
  vehicles: [
    '#c9ccd1',
    '#e8eaed',
    '#1f2933',
    '#2b4a6f',
    '#7a1f1f',
    '#3a3f45',
    '#1d3b2a',
    '#6b6f76',
  ],
  machinery: ['#e0a41d', '#d97b25', '#c2882a', '#6b6f76', '#2b4a6f', '#3a3f45'],
  gems: ['#1e4fa3', '#e0b000', '#6b2f8a', '#1d7a4d', '#a11d3a', '#2b8ca3', '#d15a2b'],
  property: ['#8a6d3b', '#5a7a4a', '#6b6f76', '#4a6b8a', '#7a5a3a'],
  bulk: ['#8a3f2a', '#b58a2a', '#5a7a3a', '#7a6f2a', '#6b6f76', '#8a6d3b'],
  general: ['#3a6ea5', '#5a6470', '#6b7a3a', '#8a5a3a', '#4a4f56'],
};
const COLOUR_NAME = {
  '#c9ccd1': 'silver',
  '#e8eaed': 'white',
  '#1f2933': 'black',
  '#2b4a6f': 'blue',
  '#7a1f1f': 'dark red',
  '#3a3f45': 'graphite',
  '#1d3b2a': 'dark green',
  '#6b6f76': 'grey',
};
const VIEWS_BY_CAT = {
  vehicles: ['Front 3/4', 'Rear 3/4', 'Interior', 'Detail'],
  machinery: ['Front / side', 'Opposite side', 'Controls', 'Attachment'],
  gems: ['Face up', 'Profile', 'Pavilion', 'Close-up'],
  property: ['Principal view', 'Second angle', 'Access / road', 'Interior / land'],
  bulk: ['Whole lot', 'Sample', 'Close-up', 'Packing'],
  general: ['Main', 'Detail', 'Markings', 'Condition'],
};
const viewsFor = (cat) => VIEWS_BY_CAT[cat] ?? VIEWS_BY_CAT.general;

// --- photorealistic prompt builder (per listing/view) ------------------------
const VIEW_ANGLE = {
  'Front 3/4': 'front three-quarter angle',
  'Rear 3/4': 'rear three-quarter angle',
  Interior: 'interior dashboard and seats',
  Detail: 'close-up detail of wheels and body',
  'Front / side': 'front and side profile',
  'Opposite side': 'opposite side profile',
  Controls: 'operator cabin and control panel',
  Attachment: 'close-up of the working attachment',
  'Face up': 'top face-up macro',
  Profile: 'side profile macro',
  Pavilion: 'pavilion underside macro',
  'Close-up': 'extreme close-up macro',
  'Principal view': 'main exterior view',
  'Second angle': 'alternate exterior angle',
  'Access / road': 'road frontage and access',
  'Interior / land': 'interior or land detail',
  'Whole lot': 'the full lot on pallets',
  Sample: 'a representative sample close-up',
  Packing: 'packaging and bags detail',
  Main: 'main product view',
  Markings: 'labels and markings',
  Condition: 'condition and wear detail',
};

function buildPrompt(item, viewLabel, colourName) {
  const cond = item.condition;
  const angle = VIEW_ANGLE[viewLabel] ?? viewLabel;
  const noText =
    'photorealistic, sharp focus, natural lighting, no text, no watermark, no logos, no people';
  const c = colourName ? `${colourName} ` : '';
  switch (item.category) {
    case 'vehicles':
      return `Professional used-vehicle marketplace photograph of a ${c}${item.title}, ${cond} condition, ${angle}, parked outdoors on a clean dealership lot, ${noText}`;
    case 'machinery':
      return `Professional heavy-equipment marketplace photograph of a ${item.title}, ${cond} condition, ${angle}, on a construction yard, industrial setting, ${noText}`;
    case 'gems':
      return `Professional gemstone catalogue macro photograph of a ${item.title}, ${angle}, on a neutral grey studio background, jewellery studio lighting, high detail, ${noText}`;
    case 'property':
      return `Professional real-estate listing photograph of ${item.title}, ${angle}, Sri Lankan setting, daylight, wide angle, ${noText}`;
    case 'bulk':
      return `Professional agricultural commodity photograph of ${item.title}, ${angle}, in a warehouse or market setting, ${noText}`;
    default:
      return `Professional marketplace product photograph of ${item.title}, ${cond} condition, ${angle}, neutral background, ${noText}`;
  }
}

// --- SVG fallback (deterministic, coherent) ---------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function silhouette(category, colour, vi) {
  const d = '#00000022';
  switch (category) {
    case 'vehicles':
      return vi === 2
        ? `<rect x="120" y="120" width="160" height="70" rx="10" fill="${colour}"/><rect x="135" y="135" width="60" height="26" rx="6" fill="${d}"/><circle cx="245" cy="150" r="16" fill="${d}"/>`
        : `<path d="M90 175 L120 140 L200 135 L245 150 L310 155 L315 178 L90 178 Z" fill="${colour}"/><rect x="150" y="140" width="55" height="26" rx="5" fill="#ffffff33"/><circle cx="140" cy="182" r="18" fill="#1a1a1a"/><circle cx="270" cy="182" r="18" fill="#1a1a1a"/>`;
    case 'machinery':
      return `<rect x="110" y="150" width="120" height="45" rx="8" fill="${colour}"/><rect x="150" y="120" width="55" height="40" rx="6" fill="${colour}"/><path d="M225 160 L290 130 L300 145 L245 175 Z" fill="${colour}"/><rect x="105" y="192" width="130" height="16" rx="8" fill="#1a1a1a"/>`;
    case 'gems': {
      const r = vi === 3 ? 70 : 52;
      return `<polygon points="200,${150 - r} ${200 + r},${150 - r * 0.2} ${200 + r * 0.6},${150 + r} ${200 - r * 0.6},${150 + r} ${200 - r},${150 - r * 0.2}" fill="${colour}"/><polygon points="200,${150 - r} ${200 + r * 0.5},${150 - r * 0.15} 200,${150 + r * 0.15} ${200 - r * 0.5},${150 - r * 0.15}" fill="#ffffff44"/>`;
    }
    case 'property':
      return `<rect x="140" y="120" width="120" height="80" fill="${colour}"/><polygon points="130,120 200,90 270,120" fill="${d}"/><rect x="160" y="150" width="24" height="50" fill="#ffffff44"/>`;
    case 'bulk':
      return `<ellipse cx="165" cy="150" rx="34" ry="30" fill="${colour}"/><ellipse cx="235" cy="150" rx="34" ry="30" fill="${colour}"/><ellipse cx="200" cy="120" rx="34" ry="30" fill="${colour}"/>`;
    default:
      return `<polygon points="150,130 250,130 275,150 175,150" fill="${colour}"/><polygon points="175,150 275,150 275,180 175,200" fill="${colour}" opacity="0.85"/>`;
  }
}
function svg(category, ref, vi, viewLabel, colour) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" role="img" aria-label="${esc(ref)} ${esc(viewLabel)} (demo)"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1420"/><stop offset="1" stop-color="#1a2233"/></linearGradient></defs><rect width="400" height="300" fill="url(#bg)"/><ellipse cx="200" cy="205" rx="140" ry="20" fill="#00000040"/>${silhouette(category, colour, vi)}<rect x="14" y="14" width="118" height="22" rx="11" fill="#00000055"/><text x="24" y="29" font-family="system-ui,sans-serif" font-size="12" fill="#e8eaed" font-weight="600">${esc(ref)}</text><rect x="14" y="262" width="${20 + viewLabel.length * 7}" height="24" rx="12" fill="#0b3d2e"/><text x="26" y="278" font-family="system-ui,sans-serif" font-size="12" fill="#8ef0c0">${esc(viewLabel)}</text><text x="386" y="26" text-anchor="end" font-family="system-ui,sans-serif" font-size="11" fill="#ffffff44" letter-spacing="1.5">SINGHA · DEMO</text></svg>`;
}

// --- OpenAI Images adapter --------------------------------------------------
async function openaiImage(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set — required for --provider=openai.');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: SIZE, quality: QUALITY, n: 1 }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI response had no image data.');
  return Buffer.from(b64, 'base64');
}

// --- run --------------------------------------------------------------------
const ext = PROVIDER === 'openai' ? 'png' : 'svg';
let count = 0;
let cost = 0;
const COST_PER = { low: 0.011, medium: 0.042, high: 0.167 }[QUALITY] ?? 0.042; // gpt-image-1 1536x1024 est.
const targets = manifest
  .filter((it) => it.imageCount > 0)
  .filter((it) => !ONLY || it.ref === ONLY)
  .slice(0, LIMIT);

// --- emit a human "image request sheet" for ChatGPT (no API needed) ---------
if (EMIT) {
  const SIZE_NOTE = 'Landscape 3:2 — 1536×1024 px (gems may use square 1024×1024). PNG or JPG.';
  const lines = [];
  lines.push('# Singha demo images — ChatGPT request sheet\n');
  lines.push(
    'Generate one image per line below in ChatGPT (a model with image generation, e.g. GPT-4o / ' +
      'gpt-image-1). **Save each file with the EXACT filename shown** and keep the category folder, ' +
      'then zip the whole `smkt` folder and send it back.\n',
  );
  lines.push(`**Image size:** ${SIZE_NOTE}\n`);
  lines.push(
    '**Priority:** the `-1` image of each listing is the card COVER — if you only do one per ' +
      'listing, do that one (54 images). All four give a full gallery (216 images).\n',
  );
  lines.push(
    '**Folder layout to zip:**\n```\nsmkt/\n  vehicles/  smkt-veh-01-1.png …\n  machinery/ smkt-mac-01-1.png …\n  gems/      smkt-gem-01-1.png …\n  property/  smkt-pro-01-1.png …\n  bulk/      smkt-bul-01-1.png …\n  general/   smkt-gen-01-1.png …\n```\n',
  );
  lines.push(
    '**Rules for every image:** photorealistic, no text/watermarks/logos, no real number plates ' +
      'or brand badges, no people. Each set of 4 must clearly be the SAME item (same colour, body, ' +
      'wear) from different angles.\n',
  );
  let curCat = '';
  for (const it of targets) {
    if (it.category !== curCat) {
      curCat = it.category;
      lines.push(`\n## ${curCat}\n`);
    }
    const palette = COLOUR_HEX[it.category] ?? COLOUR_HEX.general;
    const colourName = COLOUR_NAME[palette[hash(it.ref) % palette.length]];
    const views = viewsFor(it.category);
    const n = Math.min(VIEWS, it.imageCount);
    lines.push(`### ${it.ref} — ${it.title} _(condition: ${it.condition})_`);
    for (let v = 0; v < n; v += 1) {
      const label = views[v] ?? `view ${v + 1}`;
      const fname = `smkt/${it.category}/${it.ref.toLowerCase()}-${v + 1}.png`;
      lines.push(
        `- **\`${fname}\`** ${v === 0 ? '(cover) ' : ''}— ${buildPrompt(it, label, colourName)}`,
      );
    }
    lines.push('');
  }
  const outFile = join(HERE, 'demo-image-requests.md');
  writeFileSync(outFile, lines.join('\n'));
  console.log(
    `Wrote ChatGPT request sheet: ${outFile}\n  listings=${targets.length} images=${targets.reduce((s, it) => s + Math.min(VIEWS, it.imageCount), 0)}`,
  );
  process.exit(0);
}

for (const it of targets) {
  const dir = join(OUT, it.category);
  mkdirSync(dir, { recursive: true });
  const palette = COLOUR_HEX[it.category] ?? COLOUR_HEX.general;
  const hex = palette[hash(it.ref) % palette.length];
  const colourName = COLOUR_NAME[hex]; // undefined for non-vehicle palettes → prompt omits colour
  const views = viewsFor(it.category);
  const n = Math.min(VIEWS, it.imageCount);
  for (let v = 0; v < n; v += 1) {
    const label = views[v] ?? `view ${v + 1}`;
    const file = join(dir, `${it.ref.toLowerCase()}-${v + 1}.${ext}`);
    if (PROVIDER === 'openai') {
      const prompt = buildPrompt(it, label, colourName);
      if (DRY) {
        console.log(`  [dry] ${it.ref} v${v + 1}: ${prompt}`);
      } else {
        const buf = await openaiImage(prompt);
        writeFileSync(file, buf);
        cost += COST_PER;
      }
    } else {
      writeFileSync(file, svg(it.category, it.ref, v, label, hex));
    }
    count += 1;
  }
}

console.log(
  `\n${DRY ? '[dry-run] ' : ''}provider=${PROVIDER} ext=${ext} images=${count} listings=${targets.length}` +
    (PROVIDER === 'openai' && !DRY ? ` (~$${cost.toFixed(2)} est.)` : '') +
    `\n→ ${OUT}`,
);
if (PROVIDER === 'openai') {
  console.log(
    'Reminder: re-seed with DEMO_MEDIA_EXT=png so MediaObject storageKeys point at the .png files.',
  );
}
