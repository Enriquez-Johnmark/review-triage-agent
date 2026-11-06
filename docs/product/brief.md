# Brief: Review Triage Agent

Status: **approved by the owner** (2026-11-06). Once approved, the spec (`spec.md`) is decided round by round from it.

## In one sentence

An AI agent that reads an app's public reviews, sorts each by cause, spots spikes by week and app version, and drafts a reply for a person to approve, so a support team answers every complaint and engineers see what to fix first.

## Why it exists

A portfolio project for AI engineering roles. It shows, on real public data, the work such roles describe: automating manual work, using AI agents, knowing when to trust AI, and measuring business impact.

It works for any app on Google Play or the App Store, chosen in its settings. It uses public reviews only, is **not affiliated with any app's maker**, and uses no app maker's logo or branding.

## The problem

Popular apps collect thousands of public reviews, and many unhappy ones are never answered. Together they hold a bug report nobody reads: which release crashes, where sign-up fails, when money goes missing. Reading and answering them by hand doesn't scale, and keyword matching is too rough to trust. Sorting reviews well is the agent's first job; answering every complaint, with a person's approval, is its second.

## Who uses it

- **A support agent** answers reviews: reads the agent's draft reply, edits it, approves it.
- **A product or engineering lead** sees what is breaking: causes by week and by app version, and spikes after a release.

(In the portfolio, both are shown with a demo.)

## What it does (first version)

1. **Reads public reviews** of an app from Google Play and the App Store. Reviewer names are dropped at once; only date, stars, text, app version and whether the company replied are kept.
2. **Sorts each review by cause** with a model: crash or won't open, sign-up, login/PIN/OTP, ID verification, failed transaction, cash-out, fees, support, praise, other; plus language (Taglish, Tagalog, English) and urgency (money involved).
3. **Spots spikes:** causes by week and by app version, flagging a cause that jumps.
4. **Drafts replies** in the reviewer's language: polite, specific to the complaint, never promising what it can't know (no refunds promised, no account details asked for in public; points to official support channels).
5. **A person approves each reply.** Nothing is posted without approval; every draft, edit and approval is logged.
6. **Posting:** built against Google's Reply to Reviews API, but that API only works with the app owner's Play Console access. The portfolio shows everything up to "approved, ready to post", with posting tested against a stand-in.

## How it's used

- A **web dashboard**: the review queue, causes and spikes, drafts to approve.
- An **MCP server**, so Claude can search reviews, summarise issues and draft replies as tools.
- One **n8n workflow**: each morning, fetch new reviews, sort them and send a summary.

## What it must never do

- Post a reply nobody approved.
- Keep or show reviewers' names, or ask anyone for account numbers, PINs or OTPs.
- Promise refunds, outcomes or dates.
- Use any app maker's logo or branding, or present itself as theirs.
- Commit raw review data to the repository (a small made-up sample is used for tests; a script fetches real reviews).

## How success is shown

- **Sorting accuracy** on a labelled test set of reviews, reported in the README.
- **Reply quality** checked by rules (no promises, no requests for secrets, right language) on every draft.
- On real data: the share of complaints with an approved reply, and the top causes by app version.
- A README with screenshots and a walkthrough video, like the owner's other projects.

## Technology (proposed)

TypeScript on Node; SQLite so it runs with no setup; Claude Haiku for sorting and Claude Sonnet for replies, through the owner's API key (never a Claude subscription); React for the dashboard; the official MCP TypeScript SDK; tests and CI.

## Not in the first version

Posting to a real app (needs its owner's access), other review sources (social media, support tickets), multiple apps or companies, user accounts.

## Licence

MIT, so anyone, recruiters included, can clone and run it (owner's decision, 2026-11-06).
