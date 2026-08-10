# INTEGRATION STATUS

All external providers sit behind adapters (docs/16, docs/21). In Phase 0 none
are configured; each reports "not configured" and later phases add real adapters
plus mocks. Verify current official provider docs/limits before implementing.

| Provider interface                | Purpose                                            | Config key(s)                       | State                            |
| --------------------------------- | -------------------------------------------------- | ----------------------------------- | -------------------------------- |
| StorageProvider                   | S3-compatible object storage (immutable media)     | `STORAGE_*`                         | Not configured — adapter pending |
| AiTextProvider                    | Listing drafts, assistant, translation             | `AI_TEXT_API_KEY`                   | Not configured — adapter pending |
| AiVisionProvider                  | Document/field extraction, media QA                | `AI_VISION_API_KEY`                 | Not configured — adapter pending |
| ImageEnhancementProvider          | Safe derivative enhancement only                   | (via AI vision)                     | Not configured — adapter pending |
| MessagingProvider (Meta)          | WhatsApp / Messenger / Instagram                   | `META_APP_SECRET`, `WHATSAPP_TOKEN` | Not configured — adapter pending |
| SmsProvider                       | Transactional SMS                                  | `SMS_API_KEY`                       | Not configured — adapter pending |
| EmailProvider                     | Transactional email                                | `EMAIL_API_KEY`                     | Not configured — adapter pending |
| VideoProvider / LiveStageProvider | Live ingest/stage (evaluate Amazon IVS)            | `LIVE_PROVIDER_KEY`                 | Not configured — adapter pending |
| SimulcastProvider (YouTube)       | Distribution simulcast (never authoritative clock) | `YOUTUBE_API_KEY`                   | Not configured — adapter pending |
| PaymentProvider                   | Payment intake/reconciliation                      | `PAYMENT_PROVIDER_KEY`              | Not configured — adapter pending |
| SearchProvider                    | Rebuildable, non-authoritative index               | (TBD)                               | Not configured — adapter pending |

## Internal integration

| Concern                         | State                                               |
| ------------------------------- | --------------------------------------------------- |
| Transactional outbox            | Schema + dispatcher (stub publisher) in place       |
| Internal event bus              | Envelope contract defined; bus adapter later phase  |
| Idempotency records             | Table in place; enforcement wired per-command later |
| Integration health admin screen | Not started (docs/16)                               |

## Rule

External provider failure must never corrupt authoritative domain data. Webhooks
(when added) verify authenticity, retain provider event id, process idempotently,
and support safe replay.
