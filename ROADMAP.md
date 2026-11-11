# Roadmap

Where the Review Triage Agent stands and what comes next, in one page. The milestones come from `docs/architecture.md`; decisions, dated, from `docs/decisions.md`. Updated 2026-11-11.

## Where we are

**M1 to M7 done**, apart from the owner's spot-check of 20 real labels. The brief, the spec (25 acceptance criteria) and the architecture are approved.

| Milestone | Delivers                                                                                                    | Criteria     | Status                             |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------- |
| M1        | Setup, database, fetching from Google Play and the App Store without reviewer names, the made-up sample, CI | A1–A3        | Done (2026-11-06), code-reviewed   |
| M2        | Sorting by cause with Claude, needs a person when unsure, money issues first, the accuracy test             | B1–B5        | Done (2026-11-07), code-reviewed   |
| M3        | Spikes by week and app version; the summary numbers                                                         | C1–C2, F1    | Done (2026-11-07), code-reviewed   |
| M4        | Reply drafts, the rule checker, approval, posting once, the audit log                                       | D1–D4, E1–E5 | Done (2026-11-07), code-reviewed   |
| M5        | The dashboard                                                                                               | F5, G1       | Done (2026-11-07), code-reviewed   |
| M6        | The MCP server and the n8n daily summary                                                                    | F2–F4        | Done (2026-11-07), code-reviewed   |
| M7        | Accuracy on real reviews, README, screenshots, walkthrough video                                            | —            | Done (2026-11-11); spot-check open |

Each milestone ends with a code review, with its findings fixed.

## What needs the owner

**M7, done:** the README, screenshots and a walkthrough video of the made-up demo (`docs/showcase/`, made by `pnpm --dir web showcase`), and `eval --set` for a real labelled set kept in `data/`.

**M7, done with the owner's key (2026-11-08):** Claude's sorting of the 120 made-up reviews is recorded (`samples/recorded-labels.json`): **98.3%** right cause, against the 85% target, checked in CI (B4). The demo shows those recorded answers, and the screenshots and video were made again with Claude drafting the replies live.

**M7, the real reviews (2026-11-11):** 148 recent public Google Play reviews of three Philippine finance apps were fetched and labelled in the cloud session, as decided on 2026-11-07, and kept in `data/` (never committed). Claude sorted **77.0%** to the labelled cause, below the 85% target; the README says why. **Still open:** the owner's spot-check of 20 labels (`data/spot-check.md`, chosen by a fixed hash).

## Limits that never move

Public reviews only, without reviewer names; no app maker's branding; nothing posted without a person's approval of the exact text; the model only sorts and drafts, never decides what is posted.
