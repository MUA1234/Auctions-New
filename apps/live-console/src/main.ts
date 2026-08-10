import { createLogger } from '@singha/observability';

/**
 * Singha Live consoles — auctioneer, floor/phone clerk and video producer
 * surfaces (docs/08). The video provider NEVER determines auction state; these
 * consoles call deterministic domain commands. Full implementation lands in
 * Phase 11 (gate: live/hybrid E2E). This placeholder keeps the app in the
 * monorepo build/typecheck graph.
 */
const log = createLogger({ name: 'live-console' });

log.info('Singha Live console placeholder — implemented in Phase 11 (see docs/08).');
