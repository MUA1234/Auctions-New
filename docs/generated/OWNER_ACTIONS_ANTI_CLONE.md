# Owner Actions — Anti-Clone Retrofit

_These are the only items standing between the current state and a formal **GO**.
Every one requires GitHub org-owner / deploy-owner rights, so Claude Code cannot
perform them. All code-side hardening is already done, committed to `main` (not
pushed) and verified — see `SECURITY_RETROFIT_REPORT.md`._

## Must-do before GO

1. **Make both repositories private.**
   - `MUA1234/Auctions-New` (frontend) and `LakshanV/Auctions-Backend` (backend).
   - GitHub → repo → Settings → Danger Zone → **Change visibility → Private**.
   - This is the single biggest anti-clone control: it removes public read access to
     Tier-A/B source, including the frozen `apps/api` copy still in the frontend repo.

2. **Protect the `main` branch on both repos.**
   - Settings → Branches → Add rule for `main`: require PR before merge, require the
     **CI** + **CodeQL** + **secret-scan (Gitleaks)** checks to pass, require CODEOWNERS
     review, disallow force-push and deletion.

3. **Enable GitHub Advanced Security features** (Settings → Code security):
   - **Secret scanning** + **push protection** (blocks a secret from ever being pushed),
   - **Dependabot alerts + security updates** (the config files are already committed),
   - **CodeQL** default/advanced (the workflow is already committed).

4. **Clear the Actions billing lock so the security workflows can run.**
   - The Gitleaks / CodeQL / CI workflows are committed but currently **blocked**
     (`BLOCKED_EXTERNAL_ACCOUNT` — "The job was not started because your account
     spending limit has been reached"). Resolve the org billing/spending limit so
     these gates actually execute on push. Until then they are configured-but-not-run.

5. **Push `main` and confirm deployments are healthy.**
   - Push both repos, then verify Vercel (frontend) and Railway (backend) deploy the
     final SHAs green, with the production security headers present on live responses
     (`curl -I` the deployed home page + an API route).

## Recommended follow-ups (not GO-blocking)

- **Physically remove the frozen `apps/api` + `apps/worker` from the frontend repo**
  once `Auctions-Backend` is confirmed as the sole canonical source (they are already
  `DEPRECATED.md`-marked and imported by nothing). This deletes residual Tier-A source
  from the product repo.
- **Turn on the deployment platforms' own WAF / rate protection** (Vercel + Railway
  edge) as a second layer in front of the app-level throttler.

_No other action is required from the owner for the retrofit. Accepted, non-blocking
risks are listed in `SECURITY_WAIVERS.md`._
