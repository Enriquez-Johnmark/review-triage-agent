# AGENTS.md

**Review Triage Agent** is an AI agent that reads an app's public reviews, sorts each by cause, spots spikes, and drafts replies a person approves. It works for any app on Google Play or the App Store; it is a portfolio project on public data, **not affiliated with any app's maker**. Working name; it may be renamed.

## Phases

Each gate needs the owner's explicit "yes"; an approval for one phase never carries into the next.

| Phase                         | Status                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Brief                      | done, approved 2026-11-06 (`docs/product/brief.md`)                                                                                                             |
| 2. Spec & acceptance criteria | done, approved 2026-11-06 (`docs/product/spec.md`, 25 criteria)                                                                                                 |
| 3. Architecture               | done, approved 2026-11-06 (`docs/architecture.md`)                                                                                                              |
| 4. Build                      | **in progress**: M1 (fetching, database, sample), M2 (sorting), M3 (spikes, summary) and M4 (replies, approval, posting) done; M5 next (`docs/architecture.md`) |

Code follows the build order in `docs/architecture.md`, one milestone at a time; each ends with a code review.

## Owner decisions

Every decision needing the owner's judgement is put as numbered rounds of questions, each with a recommended answer, worded so "yes" accepts it. Record every approved decision, dated, in `docs/decisions.md`.

## Rules

- **Public data only.** Reviewer names are dropped when reviews are read; no raw review data is committed; tests use a small made-up sample.
- **No branding.** No app maker's logo, colours or wording that could pass for an official product. The README says it uses public reviews and is not affiliated with any app's maker.
- **A person approves every reply.** Nothing is posted without approval, and the approval binds the exact text approved. Every draft, edit and approval is logged.
- **Model output is untrusted.** Sorting results and drafts are parsed into strict types and checked by rules (no promises of refunds or dates, no requests for account numbers, PINs or OTPs, the right language) before a person sees them.
- **API key only.** The Claude API through the owner's key, never a Claude subscription; no review data to free model tiers that train on inputs.
- **Tests:** every acceptance criterion has a test whose name starts with its ID, e.g. `e3_posting_twice_posts_once`.
- **Before every commit:** `pnpm lint`, `pnpm typecheck` and `pnpm test` pass (and for `web/`, its own checks).
- **Report test results only from commands actually run.**
- **Small commits** on `main`, each one behaviour or one doc change; messages imperative; no AI attribution trailers (owner's choice). Commits are signed.
