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

## The dashboard

- **Local only:** `pnpm cli serve` listens on 127.0.0.1 and answers only requests addressed to this computer (127.0.0.1 or localhost), so a web page can't reach it by DNS rebinding; changes must come from its own pages (the Origin header).
- **Who:** there are no accounts. The person types their name at the top; it goes with every approval, edit and post, and is kept in that browser only.
- **The API key** stays in `.env`: the settings page says only whether it is set. A failed Claude call is reported by its status only, in the answer and in the log (F5).
- **Settings** (the app's store IDs, the support channel, the threshold) are saved in the database and used by the commands too, unless a flag is given.
- **Charts** use a validated categorical palette: the app's first seven causes have one colour each, always the same; later causes are folded into "Other causes". Each chart can be shown as a table.
- **The demo:** `pnpm cli load-demo` loads the 120 made-up labelled reviews, dated over the last nine weeks, with a crash spike in version 4.2.0 this week, for the browser test and a first look without a key.

## MCP

The official `@modelcontextprotocol/sdk` over stdio (`pnpm cli mcp`), using the same `src/core/` and store. Its tool list is fixed in code to the five tools; `src/mcp/` doesn't import the approve, edit or post functions, and a test checks it. Inputs are strict zod schemas: an unknown field or bad value is refused, saying what is wrong. Dates are Manila days. `draft_reply` never replaces a reply a person wrote.

## n8n

A committed workflow (`n8n/daily-summary.json`) runs each morning at 8, Manila time: it asks the agent to fetch and sort, gets the daily summary and emails it. Docker Compose runs n8n and Mailpit for the demo.

- **Where n8n calls:** n8n runs in Docker, which can't reach the dashboard on 127.0.0.1. With `SUMMARY_TOKEN` set, `pnpm cli serve` also opens a second listener (port 4318) with only `GET /summary` and `POST /fetch`, behind that token; the dashboard stays local. The dashboard's own `GET /api/summary` gives the same summary.
- **The summary** counts the last seven days (so Monday's email covers the week just ended): new reviews since yesterday, share answered, the top three causes, spikes this week and last plus the latest version's crash spike, and money complaints still waiting for a posted reply.

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
