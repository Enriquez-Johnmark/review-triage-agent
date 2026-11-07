# Architecture

Status: **approved by the owner** (2026-11-06). The spec is `product/spec.md`; this says how it is built.

## Shape

One TypeScript package, with the dashboard in `web/`:

| Folder       | Holds                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `src/core/`  | The rules, with no input or output: causes, spike detection, the reply checker, approval fingerprints |
| `src/store/` | The SQLite database and its migrations                                                                |
| `src/fetch/` | Reading reviews from Google Play and the App Store                                                    |
| `src/model/` | The model client: live (Claude) and recorded (for tests)                                              |
| `src/api/`   | The web API the dashboard and n8n use                                                                 |
| `src/mcp/`   | The MCP server                                                                                        |
| `src/cli.ts` | The commands: `fetch`, `sort`, `eval`, `serve`, `mcp`                                                 |
| `web/`       | The React dashboard                                                                                   |
| `samples/`   | The made-up reviews used by tests and the demo                                                        |
| `data/`      | The real database and fetched reviews: **ignored by git**                                             |

The safety rules live in `src/core/` and are used by every way in (the API, the commands and MCP), so none of them can skip a rule.

## Tools

Node 22 and pnpm; strict TypeScript; **zod** for every input and every model answer; **Fastify** for the API; **React** with Vite and shadcn/ui for the dashboard; **Vitest** for tests and **Playwright** for browser tests; ESLint and Prettier.

## Database

SQLite through `better-sqlite3`, one file in `data/`, with numbered migrations.

| Table       | Holds                                                                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reviews`   | One per store review: store, store review ID, app ID, date, stars, text, app version, whether the company replied. **No reviewer names.** Unique on (store, store review ID) |
| `labels`    | A review's cause, language, money flag, confidence, and whether a person set it                                                                                              |
| `drafts`    | Reply drafts and their rule-check results                                                                                                                                    |
| `approvals` | An approval with the fingerprint (SHA-256) of the exact text approved                                                                                                        |
| `posts`     | Each post, with a unique key recorded **before** the poster is called                                                                                                        |
| `audit_log` | Every draft, edit, approval, refusal, post and hand-set cause: when, who, what. Append-only                                                                                  |
| `settings`  | The app's store IDs, the causes, the support channel text, the confidence threshold                                                                                          |

## The model

Behind an interface with two versions:

- **Live:** the official Anthropic SDK with the owner's API key; `claude-haiku-5-5` sorts, `claude-sonnet-5-5` writes replies.
- **Recorded:** replays saved answers, so tests and CI run without a key.

Every answer is parsed with zod; anything that doesn't match goes to needs a person. The request type carries only the allowed fields (text, stars, app version, cause), so D4 holds by construction.

## Fetching

- **Google Play:** the open-source `google-play-scraper` package (Node).
- **App Store:** Apple's public customer-review feed.

Reviewer names are dropped inside the fetcher, before anything is stored. Reviews are keyed by store and store review ID, so fetching again adds nothing.

## Replies

- **The support channel is added by code**, after the model's reply, so every reply ends with it (D1); the model is told the room left and never writes a channel, phone number, email or link.
- **The rule checker** (`src/core/reply-rules.ts`) uses word lists in English, Tagalog and Taglish. It errs on the strict side: a reply wrongly refused is redrafted or written by a person, while a reply wrongly passed would go public. For example, "bukas" (tomorrow, but also "open") counts as a promised date.
- **Language** is told apart by common words of each language. A review a person sorted by hand has no language label, so its reply's language isn't checked.
- **A person, by name,** writes, edits, approves, refuses and posts; the model's name is refused. A reply that breaks a rule can't be approved, and a model draft never replaces an approved reply.

## Posting once

As in the owner's engine, Nudgewright: an approved text gets a unique key, recorded before the poster is called; a reply already posted is never sent again. `StubPoster` records what would have been posted; `GooglePlayPoster` calls Google's Reply to Reviews API and is used only when credentials are set (`GOOGLE_PLAY_CREDENTIALS`, the app owner's service account key). Replying again on Google replaces the reply, so finishing a post cut off by a crash can't post twice. Apple has no public reply API: App Store replies are posted by hand, and the Google poster refuses them before anything is recorded.

## Spikes and the summary numbers

How the spec's rules are counted (`src/core/spikes.ts`, `src/core/overview.ts`):

- **Weeks** start on Monday at midnight, Manila time (UTC+8, no daylight saving).
- **The first week of fetched reviews is partial** (fetching takes the newest reviews), so it never counts toward a four-week average: a week is judged only when its four weeks before all come after it.
- **A version spike** also needs at least 5 crash reviews on that version, as a week spike needs 5 reviews, so a version with three reviews isn't called. Shares count sorted reviews only. Versions are ordered by their numbers (4.10.0 after 4.9.2).
- **Share answered** is this week's answered reviews out of those whose reply status the store gives; Apple's public feed doesn't say, so App Store reviews are left out of it.
- An app is summarised across both its store IDs (Google Play and App Store).

## Time

Read only through an injected clock, so tests control weeks and versions.

## MCP

The official `@modelcontextprotocol/sdk` over stdio, using the same `src/core/` and store. Its tool list is fixed in code to the five tools; no approve or post function is reachable from it.

## n8n

A committed workflow calls `GET /api/summary` each morning and emails the result. Docker Compose runs n8n and Mailpit for the demo.

## CI

GitHub Actions: lint, typecheck, unit tests, a browser test, and the A3 check that fails if review data is committed.

## Build order

| Milestone | Delivers                                                           | Criteria     |
| --------- | ------------------------------------------------------------------ | ------------ |
| M1        | Repository setup, database, fetching, the made-up sample           | A1–A3        |
| M2        | Sorting with recorded answers, the `eval` command, accuracy report | B1–B5        |
| M3        | Spikes and the summary numbers                                     | C1–C2, F1    |
| M4        | Replies, rule checker, approval, posting, audit log                | D1–D4, E1–E5 |
| M5        | The dashboard                                                      | F5, G1       |
| M6        | MCP server and the n8n daily summary                               | F2–F4        |
| M7        | Real-data evaluation, README, screenshots, walkthrough video       | —            |

Each milestone ends with a code review. Live sorting and the real-data evaluation need the owner's API key, run on the owner's machine; everything else runs without one.
