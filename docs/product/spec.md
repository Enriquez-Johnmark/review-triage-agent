# Spec: Review Triage Agent

Decided round by round with the owner; the single source for spec decisions. The brief is `brief.md`. Status: **in progress** (Rounds 1–2 decided 2026-11-06).

## Words

- A **review** is one public app-store review: its date, stars, text, app version and whether the company replied. Never the reviewer's name.
- A **cause** is what a review is about, from the fixed list below.
- A **draft** is a reply the agent wrote; a person **approves** it, exactly as approved, before it can be **posted**.

## Sorting (Round 1, 2026-11-06)

- **Causes**, one main cause per review, from a fixed list: crash or won't open; sign-up; login, PIN or OTP; ID verification; failed or pending transaction; cash-out or transfer delay; fees; support or no response; praise; other.
- Each review also gets its **language** (Taglish, Tagalog or English) and a **money involved** flag (money deducted, missing or not received). Money-involved reviews come first in the queue.
- The model returns a **confidence** with each label. Below a set threshold the review goes to **needs a person** instead of a cause.
- Sorting uses **Claude Haiku** through the owner's API key. Its answer is parsed into strict types; anything that doesn't parse goes to needs a person.

## Measuring accuracy (Round 1, 2026-11-06)

- A committed **made-up test set** of about 120 reviews, written to resemble real ones, each with its correct cause, language and money flag.
- A **real test set** of about 150 real reviews, labelled on the owner's machine and never committed. Labels are prepared by the agent's author; the owner spot-checks 20.
- The README reports both scores: accuracy per cause, and how often a review went to needs a person.

## Spikes (Round 1, 2026-11-06)

- **By week:** a cause's count in a week is at least **double its average over the previous four weeks**, and at least **5 reviews**.
- **By app version:** a version whose share of crash reviews is at least **double the previous version's**.
- Spikes show on the dashboard and in the daily summary.

## Replies (Round 1, 2026-11-06)

- Written by **Claude Sonnet**, in the **reviewer's language**, at most **350 characters** (Google Play's limit), specific to the complaint.
- Every reply ends with the **support channel the user set in the settings**; the agent never makes up a phone number, address or link.
- **Checked by code** before a person sees it:
  - no promised refunds, outcomes or dates;
  - no request for account numbers, PINs, OTPs, passwords or ID numbers;
  - no blaming the customer;
  - the right language and length, and the support channel present.
- A draft that breaks a rule is **redrafted once**; if it breaks one again, it is flagged for a person to write.

## Approval, posting and the log (Round 1, 2026-11-06)

- **Approval binds the exact text:** it records a fingerprint (hash) of the text approved; any later edit needs a fresh approval.
- Every draft, edit, approval, refusal and post is kept in an **audit log**.
- **Posting** goes to a stand-in for Google's Reply to Reviews API that records what would have been posted. The real Google connection is built but switches on only with the app owner's credentials.

## Users (Round 1, 2026-11-06)

- **One local user**, with no sign-up or accounts: a tool that runs on the owner's machine or a recruiter's.

## Dashboard (Round 2, 2026-11-06)

- **Overview:** reviews this week, share answered, top causes, and spikes, each linked to the reviews behind it.
- **Queue:** reviews waiting for a reply; money-involved first, then the newest one- and two-star reviews. Each shows cause, language and confidence; the cause can be changed by hand.
- **Review:** one review with its draft; edit, approve, refuse, or write a reply by hand. The rule checks show beside the draft.
- **Settings:** the app to watch, the support channel text, the confidence threshold, and whether the API key is set (never the key itself).
- **Charts:** causes by week (stacked bars) and crash share by app version (a line). Counts and shares only.

## MCP server (Round 2, 2026-11-06)

- Five tools: `search_reviews` (by cause, stars, date, version or words), `summarise_issues` (top causes and spikes for a period), `get_review`, `draft_reply` (creates a draft that still waits for a person) and `list_spikes`.
- **No tool approves or posts.** Only a person in the dashboard can, enforced in code, not in the tools' descriptions.

## Fetching (Round 2, 2026-11-06)

- A `fetch` command pulls new Google Play and App Store reviews and sorts them; run by hand, from the dashboard, or on a schedule. Reviews already fetched are skipped, so running it twice adds nothing.

## Daily summary (Round 2, 2026-11-06)

- An **n8n workflow**, committed so anyone can import it: each morning it asks the agent to fetch and sort, then emails a short summary (new reviews, share answered, top 3 causes, spikes, money-involved reviews still waiting) to a chosen inbox, Mailpit in the demo.

## Demo data (Round 2, 2026-11-06)

- Screenshots and the video use real reviews of two or three popular Philippine finance apps, fetched on the owner's machine, without reviewer names. Replies are never posted to the real app, and screenshots avoid reviews that mention personal details.

## Open

- Round 3: acceptance criteria.
