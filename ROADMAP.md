# Roadmap

Where the Review Triage Agent stands and what comes next, in one page. The milestones come from `docs/architecture.md`; decisions, dated, from `docs/decisions.md`. Updated 2026-11-07.

## Where we are

**M1 to M6 done; M7 in progress.** The brief, the spec (25 acceptance criteria) and the architecture are approved.

| Milestone | Delivers                                                                                                    | Criteria     | Status                           |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------- |
| M1        | Setup, database, fetching from Google Play and the App Store without reviewer names, the made-up sample, CI | A1–A3        | Done (2026-11-06), code-reviewed |
| M2        | Sorting by cause with Claude, needs a person when unsure, money issues first, the accuracy test             | B1–B5        | Done (2026-11-07), code-reviewed |
| M3        | Spikes by week and app version; the summary numbers                                                         | C1–C2, F1    | Done (2026-11-07), code-reviewed |
| M4        | Reply drafts, the rule checker, approval, posting once, the audit log                                       | D1–D4, E1–E5 | Done (2026-11-07), code-reviewed |
| M5        | The dashboard                                                                                               | F5, G1       | Done (2026-11-07), code-reviewed |
| M6        | The MCP server and the n8n daily summary                                                                    | F2–F4        | Done (2026-11-07), code-reviewed |
| M7        | Accuracy on real reviews, README, screenshots, walkthrough video                                            | —            | **In progress**                  |

Each milestone ends with a code review, with its findings fixed.

## What needs the owner

**M7, done:** the README, screenshots and a walkthrough video of the made-up demo (`docs/showcase/`, made by `pnpm --dir web showcase`), and `eval --set` for a real labelled set kept in `data/`.

**M7, done with the owner's key (2026-11-08):** Claude's sorting of the 120 made-up reviews is recorded (`samples/recorded-labels.json`): **98.3%** right cause, against the 85% target, checked in CI (B4). The demo shows those recorded answers, and the screenshots and video were made again with Claude drafting the replies live.

**M7, waiting on the owner's machine** (real reviews never come here):

1. Fetch real reviews of two or three popular Philippine finance apps into `data/`, and label about 150 (`data/real-labelled.json`, the same shape as `samples/labelled.json`); the owner spot-checks 20. Then `pnpm cli eval --set data/real-labelled.json --record`; only the scores go in the README.

## Limits that never move

Public reviews only, without reviewer names; no app maker's branding; nothing posted without a person's approval of the exact text; the model only sorts and drafts, never decides what is posted.
