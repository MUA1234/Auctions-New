# Singha demo marketplace media

Coherent, same-item image sets for the realistic demo catalogue (`SMKT-*` listings), served
self-hosted from `apps/web/public/demo/smkt/…` and referenced by the backend seeder's MediaObject
rows. Two backends behind one command:

| Provider          | Command                                                                       | Output                                                                    | Needs                                                |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| **svg** (default) | `node apps/web/scripts/gen-demo-media.mjs`                                    | procedural vector placeholders (`.svg`)                                   | nothing (offline, license-clean)                     |
| **openai**        | `OPENAI_API_KEY=… node apps/web/scripts/gen-demo-media.mjs --provider=openai` | **real photorealistic images** (`.png`) via OpenAI Images (`gpt-image-1`) | an OpenAI key + outbound network to `api.openai.com` |

> The `--provider=openai` path **cannot run inside a restricted sandbox** where `api.openai.com`
> is unreachable — run it on your machine / CI / a build box that has network + the key.

## Real images — full flow

```bash
# 0. (once, or whenever the dataset changes) regenerate the manifest from the seeded DB:
#    DATABASE_URL=… node ../Auctions-Backend/database/prisma/emit-demo-manifest.mjs \
#      > apps/web/scripts/demo-media.manifest.json

# 1. Preview the prompts without spending anything:
node apps/web/scripts/gen-demo-media.mjs --provider=openai --dry-run --only=SMKT-VEH-01

# 2. Generate real PNGs (start small to check quality + cost):
OPENAI_API_KEY=sk-… node apps/web/scripts/gen-demo-media.mjs --provider=openai --limit=3 --quality=low

# 3. Full run (≈216 images across 54 listings):
OPENAI_API_KEY=sk-… node apps/web/scripts/gen-demo-media.mjs --provider=openai --quality=medium

# 4. Re-seed so MediaObject storageKeys point at the .png files (backend):
DATABASE_URL=… DEMO_MEDIA_EXT=png DEMO_MEDIA_BASE=<web-origin> \
  node database/prisma/seed-marketplace-reset.ts && \
  DATABASE_URL=… DEMO_MEDIA_EXT=png DEMO_MEDIA_BASE=<web-origin> \
  node database/prisma/seed-marketplace.ts
```

## Options

- `--views=N` — images per listing (default 4; use `1` for cover-only to cut cost).
- `--quality=low|medium|high` — gpt-image-1 quality (cost ≈ $0.011 / $0.042 / $0.167 per image).
- `--size=1536x1024` — landscape for catalogue cards.
- `--limit=N`, `--only=SMKT-VEH-01` — scope the run (testing / cost control).
- `--dry-run` — print the prompts only, no API call.

## Coherence & cost notes

- Each listing's four views share one prompt base (title + category + condition + colour) so they
  depict the **same** item. Text-to-image cannot pixel-lock multi-view identity — for
  photograph-grade consistency use a real photo set (option 3) or an img2img / IP-Adapter /
  reference-image pass. See `docs/generated/SINGHA_OSS_DECISIONS.md` in the backend for the
  provider-neutral / OSS image-generation decision (self-hosted SDXL/Flux vs managed).
- A full medium-quality run of ~216 images is roughly **$9**; start with `--limit`/`--quality=low`.

## Media pipeline (unchanged by provider)

`mediaUrl()` serves the `demo/…` namespace same-origin from `public/demo/…`; the seeder writes one
cover + view MediaObject rows per listing (immutable original, sort order, `image/png` or
`image/svg+xml` mime). Production uses real object storage instead of the demo namespace.
