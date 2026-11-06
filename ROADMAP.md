# Roadmap

Where the Review Triage Agent stands and what comes next, in one page. The milestones come from `docs/architecture.md`; decisions, dated, from `docs/decisions.md`. Updated 2026-11-07.

## Where we are

**M1 done; M2 next.** The brief, the spec (25 acceptance criteria) and the architecture are approved.

| Milestone | Delivers                                                                                                    | Criteria     | Status                           |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------- |
| M1        | Setup, database, fetching from Google Play and the App Store without reviewer names, the made-up sample, CI | A1–A3        | Done (2026-11-06), code-reviewed |
| M2        | Sorting by cause with Claude, needs a person when unsure, money issues first, the accuracy test             | B1–B5        | **Next**                         |
| M3        | Spikes by week and app version; the summary numbers                                                         | C1–C2, F1    |                                  |
| M4        | Reply drafts, the rule checker, approval, posting once, the audit log                                       | D1–D4, E1–E5 |                                  |
| M5        | The dashboard                                                                                               | F5, G1       |                                  |
| M6        | The MCP server and the n8n daily summary                                                                    | F2–F4        |                                  |
| M7        | Accuracy on real reviews, README, screenshots, walkthrough video                                            | —            |                                  |

Each milestone ends with a code review, with its findings fixed.

## What needs the owner

- **M2:** run the accuracy test once on the owner's machine with the Anthropic API key in `.env` (`pnpm cli eval --record`); it records the model's answers on the made-up set, so CI can check them without a key.
- **M7:** fetch and label real reviews on the owner's machine for the real-data scores and the demo; nothing real is committed.

## Limits that never move

Public reviews only, without reviewer names; no app maker's branding; nothing posted without a person's approval of the exact text; the model only sorts and drafts, never decides what is posted.
